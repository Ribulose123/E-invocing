export const handleUnauthorized = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userBusinessId');
    localStorage.removeItem('businessIdSkipped');
    localStorage.removeItem('businessIdEntered');
    localStorage.removeItem('aggregatorSelectedCustomerId');
  } catch {
  }
  try {
    window.location.href = '/';
  } catch {
  }
};

