const choices = document.getElementById("choices");
const progress = document.getElementById("progress");
const success = document.getElementById("success");
const error = document.getElementById("error");

async function connect(provider) {
  choices.hidden = true;
  progress.hidden = false;
  error.textContent = "";
  let loginWindow;
  try {
    await globalThis.AtelierSync.pair(async (code) => {
      const url = `https://atelier-olive-omega.vercel.app/extension-connect?code=${encodeURIComponent(code)}&provider=${encodeURIComponent(provider)}`;
      loginWindow = await chrome.windows.create({ url, type: "popup", width: 520, height: 760 });
    });
    if (loginWindow?.id) chrome.windows.remove(loginWindow.id).catch(() => {});
    const profile = await globalThis.AtelierSync.profile();
    progress.hidden = true;
    success.hidden = false;
    document.getElementById("profile-name").textContent = `Connected as ${profile.displayName || profile.email?.split("@")[0] || "yourself"}`;
    document.getElementById("profile-email").textContent = profile.email || "Your private account is ready.";
    const avatar = document.getElementById("avatar");
    avatar.textContent = (profile.displayName || profile.email || "A").slice(0, 1).toUpperCase();
    if (profile.photoURL) { avatar.textContent = ""; avatar.style.backgroundImage = `url(${JSON.stringify(profile.photoURL).slice(1, -1)})`; }
    setTimeout(() => window.close(), 1800);
  } catch (caught) {
    progress.hidden = true;
    choices.hidden = false;
    error.textContent = caught?.message || "Could not connect to Atelier.";
  }
}

choices.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-provider]");
  if (button) void connect(button.dataset.provider);
});
