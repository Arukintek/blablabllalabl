document.addEventListener('DOMContentLoaded', () => {
  checkAccess('teacher'); initLogout();
  const user = getCurrentUser();
  document.getElementById('profile-info').textContent = `Имя: ${user.name} | Email: ${user.email}`;
});