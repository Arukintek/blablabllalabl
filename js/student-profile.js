document.addEventListener('DOMContentLoaded', () => {
  checkAccess('student'); initLogout();
  const user = getCurrentUser();
  document.getElementById('profile-info').textContent = `Имя: ${user.name} | Группа: ${user.group} | Email: ${user.email}`;
});