import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
