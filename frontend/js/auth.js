document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = !!document.getElementById('login-form');
  const isRegisterPage = !!document.getElementById('register-form');

  initNavbar(isLoginPage ? 'login' : (isRegisterPage ? 'register' : ''));

  if (isLoginPage) {
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
  }

  if (isRegisterPage) {
    const regForm = document.getElementById('register-form');
    regForm.addEventListener('submit', handleRegister);
  }
});

function setRole(role) {
  const roleInput = document.getElementById('login-role');
  const btnCustomer = document.getElementById('btn-role-customer');
  const btnManager = document.getElementById('btn-role-manager');
  const submitBtn = document.getElementById('btn-login-submit');

  if (role === 'manager') {
    roleInput.value = 'manager';
    btnManager.classList.add('active');
    btnCustomer.classList.remove('active');
    submitBtn.textContent = 'Sign In as Turf Manager';
    submitBtn.className = 'btn btn-secondary btn-full';
  } else {
    roleInput.value = 'customer';
    btnCustomer.classList.add('active');
    btnManager.classList.remove('active');
    submitBtn.textContent = 'Sign In as Customer';
    submitBtn.className = 'btn btn-primary btn-full';
  }
}

function fillCredentials(email, password, role) {
  setRole(role);
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const role = document.getElementById('login-role').value;
  const submitBtn = document.getElementById('btn-login-submit');

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Verifying credentials...';

  try {
    const res = await API.post('/api/auth/login', { email, password, role });
    showToast(res.message || 'Logged in successfully!', 'success');

    // Route based on role
    setTimeout(() => {
      if (res.user.role === 'manager') {
        window.location.href = '/manager-dashboard.html';
      } else {
        // If there was a redirect query param, return there
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        window.location.href = redirect || '/customer-dashboard.html';
      }
    }, 600);
  } catch (err) {
    showToast(err.message || 'Login failed. Please check credentials.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  const submitBtn = document.getElementById('btn-reg-submit');

  if (password !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const res = await API.post('/api/auth/register', {
      name,
      email,
      phone,
      password,
      confirmPassword
    });

    showToast('Registration successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/customer-dashboard.html';
    }, 700);
  } catch (err) {
    showToast(err.message || 'Registration failed.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}
