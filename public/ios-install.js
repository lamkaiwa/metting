const url = new URL('/?source=homescreen', location.origin).href;
if (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) {
  location.replace(url);
} else {
  document.querySelector('#site-link').value = url;
  document.querySelector('#copy-link').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = '链接已复制，打开 Safari 粘贴后添加到主屏幕。';
    } catch {
      document.querySelector('#copy-fallback').classList.add('shown');
      const input = document.querySelector('#site-link');
      input.focus();
      input.select();
      status.textContent = '请长按下方链接复制。';
    }
  });
}
