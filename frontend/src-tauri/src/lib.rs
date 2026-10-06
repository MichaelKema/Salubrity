use serde::Serialize;
use serde_json::Value;
use std::{io::{BufRead, BufReader}, path::PathBuf, process::{Child, Command, Stdio}, sync::{mpsc, Mutex}, time::Duration};
use tauri::Manager;

struct Backend {
    child: Mutex<Option<Child>>,
    url: String,
    token: String,
    client: reqwest::Client,
}
impl Backend {
    fn stop(&self) {
        if let Ok(mut child) = self.child.lock() {
            if let Some(mut process) = child.take() { let _ = process.kill(); let _ = process.wait(); }
        }
    }
}
impl Drop for Backend { fn drop(&mut self) { self.stop(); } }

fn executable() -> Result<PathBuf, Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        let suffix = if cfg!(target_arch = "aarch64") { "aarch64-apple-darwin" } else { "x86_64-apple-darwin" };
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("binaries/salubrity-backend-{suffix}")))
    } else {
        Ok(std::env::current_exe()?.parent().ok_or("Missing executable directory")?.join("salubrity-backend"))
    }
}

fn start_backend(data: PathBuf) -> Result<Backend, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(&data)?;
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&data, std::fs::Permissions::from_mode(0o700))?;
    }
    let mut random = [0u8; 32];
    getrandom::fill(&mut random).map_err(|_| "Could not create private session token")?;
    let token: String = random.iter().map(|b| format!("{b:02x}")).collect();
    let client = reqwest::Client::builder().timeout(Duration::from_secs(15)).no_proxy().redirect(reqwest::redirect::Policy::none()).build()?;
    let mut child = Command::new(executable()?)
        .arg("--Salubrity:Desktop=true")
        .arg(format!("--Salubrity:ParentPid={}", std::process::id()))
        .env("SALUBRITY_API_TOKEN", &token)
        .env("Salubrity__DataDirectory", &data)
        .env("DOTNET_BUNDLE_EXTRACT_BASE_DIR", data.join("runtime"))
        .env("ASPNETCORE_ENVIRONMENT", "Production")
        .env("Logging__LogLevel__Default", "Warning")
        .current_dir(&data).stdout(Stdio::piped()).stderr(Stdio::null()).spawn()?;
    let stdout = child.stdout.take().ok_or("Missing backend startup channel")?;
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(url) = line.strip_prefix("SALUBRITY_READY:") { let _ = tx.send(url.to_owned()); }
        }
    });
    let url = match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(url) if valid_backend_url(&url) => url,
        _ => { let _ = child.kill(); let _ = child.wait(); return Err("The bundled nutrition service could not start. Please reinstall Salubrity.".into()); }
    };
    Ok(Backend { child: Mutex::new(Some(child)), url, token, client })
}

fn valid_backend_url(url: &str) -> bool {
    url.strip_prefix("http://127.0.0.1:")
        .and_then(|port| port.parse::<u16>().ok()).is_some_and(|port| port > 0)
}

#[derive(Serialize)]
struct ApiResponse { status: u16, body: Value }

async fn call(backend: &Backend, method: reqwest::Method, path: &str, body: Option<Value>, query: Option<&str>) -> Result<ApiResponse, String> {
    let mut request = backend.client.request(method, format!("{}{path}", backend.url)).header("X-Salubrity-Token", &backend.token);
    if let Some(body) = body { request = request.json(&body); }
    if let Some(query) = query { request = request.query(&[("query", query)]); }
    let response = request.send().await.map_err(|_| "Your local nutrition service is unavailable. Close and reopen Salubrity.".to_string())?;
    let status = response.status().as_u16();
    let body = response.json::<Value>().await.map_err(|_| "The nutrition service returned an invalid response.".to_string())?;
    Ok(ApiResponse { status, body })
}
#[tauri::command]
async fn tracker_request(backend: tauri::State<'_, Backend>, state: Option<Value>) -> Result<ApiResponse, String> {
    call(&backend, if state.is_some() { reqwest::Method::PUT } else { reqwest::Method::GET }, "/api/tracker", state, None).await
}
#[tauri::command]
async fn food_search(backend: tauri::State<'_, Backend>, query: String) -> Result<ApiResponse, String> {
    if query.trim().len() < 2 || query.chars().count() > 120 { return Err("Enter between 2 and 120 characters to search.".into()); }
    call(&backend, reqwest::Method::GET, "/api/foods/search", None, Some(&query)).await
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") { let _ = window.show(); let _ = window.set_focus(); }
        }))
        .setup(|app| {
            let data = std::env::var_os("SALUBRITY_DATA_DIRECTORY").map(PathBuf::from)
                .unwrap_or(app.path().data_dir()?.join("Salubrity"));
            app.manage(start_backend(data)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![tracker_request, food_search])
        .build(tauri::generate_context!()).expect("Could not initialize Salubrity");
    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Exit) { handle.state::<Backend>().stop(); }
    });
}

#[cfg(test)]
mod tests {
    use super::valid_backend_url;
    #[test]
    fn accepts_only_a_private_loopback_endpoint() {
        assert!(valid_backend_url("http://127.0.0.1:49152"));
        for bad in ["http://example.com:80", "http://127.0.0.1:0", "http://127.0.0.1:80/path", "http://127.0.0.1:80@evil.com", "http://127.0.0.1:65536"] { assert!(!valid_backend_url(bad)); }
    }
}
