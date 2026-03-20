// 🔥 GLOBALNY CLIENT (tylko tutaj!)
window.supabaseClient = window.supabase.createClient(
  'https://wzanqzcjrpbhocrfcciy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
);

// 🔐 LOGIN
window.login = async function () {

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const errorBox = document.getElementById("loginError");

  const email = emailInput.value;
  const password = passwordInput.value;

  errorBox.innerText = "";

  loginBtn.innerText = "Logowanie...";
  loginBtn.classList.add("loading");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  loginBtn.innerText = "Zaloguj";
  loginBtn.classList.remove("loading");

  if (error) {
    errorBox.innerText = "❌ Nieprawidłowy email lub hasło";
    return;
  }

  localStorage.setItem("savedEmail", email);

  location.reload();
};

// 🔓 LOGOUT
window.logout = async function () {
  await supabase.auth.signOut();
  location.reload();
};

// 👤 INIT NAVBAR (NAJWAŻNIEJSZE)
window.initAuthUI = async function () {

  const { data } = await supabase.auth.getUser();

  const userBox = document.getElementById("userBox");
  const loginBox = document.getElementById("loginBox");
  const userName = document.getElementById("userName");

  if (!data.user) {
    // ❌ NIEZALOGOWANY
    if(userBox) userBox.style.display = "none";
    if(loginBox) loginBox.style.display = "flex";
    return;
  }

  // ✅ ZALOGOWANY
  if(userBox) userBox.style.display = "flex";
  if(loginBox) loginBox.style.display = "none";

  // 🔎 pobierz gracza
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('email', data.user.email)
    .single();

  if (player && userName) {
    userName.innerHTML =
      `<span class="avatar">${player.avatar || "👤"}</span> ${player.name}`;
  }

};
