document.addEventListener('DOMContentLoaded', () => {
  checkAccess('admin'); initLogout();
  const user = getCurrentUser();
  document.getElementById('profile-info').textContent = `Имя: ${user.name} | Email: ${user.email}`;
});