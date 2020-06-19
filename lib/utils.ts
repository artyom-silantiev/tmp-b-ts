export function getRandomString(len?) {
  let str = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  len = len || 8;

  for (let i = 0; i < len; i++) {
    str += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return str;
}

export function getUid() {
  return Date.now().toString(36) + '.' + this.getRandomString();
}

export async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
