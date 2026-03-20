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
window.initAuthUI = async function() {
    const supabase = window.supabaseClient;

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) console.log(error);
        if (user) {
            console.log("Zalogowany jako:", user.email);
        } else {
            console.log("Nie zalogowany");
        }
    } catch (err) {
        console.error("Błąd initAuthUI:", err);
    }
};

window.login = async function() {
    const supabase = window.supabaseClient;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");
    const errorBox = document.getElementById("loginError");

    const email = emailInput.value;
    const password = passwordInput.value;

    errorBox.innerText = "";
    loginBtn.innerText = "Logowanie...";
    loginBtn.classList.add("loading");

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorBox.innerText = "❌ Nieprawidłowy email lub hasło";
            console.log(error);
        } else {
            localStorage.setItem("savedEmail", email);
            init(); // funkcja z main.js odświeża UI
        }
    } catch (err) {
        console.error("Błąd logowania:", err);
        errorBox.innerText = "❌ Błąd logowania";
    } finally {
        loginBtn.innerText = "Zaloguj";
        loginBtn.classList.remove("loading");
    }
};
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
