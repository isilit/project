/** Кодирование пароля в Base64 перед отправкой на сервер (по ТЗ). */
export function encodePasswordBase64(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

export function decodePasswordBase64(encoded) {
  return decodeURIComponent(escape(atob(encoded)));
}
