import { User } from "../type";

export const parseUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userData = localStorage.getItem('userData');
  const token = localStorage.getItem('authToken');
  
  if (!userData || !token) {
    return null;
  }

  try {
    const userObj = JSON.parse(userData) as any;
    
    // Try to get id from various possible field names
    const userId = userObj.id || userObj.user_id || userObj._id || userObj.ID;
    
    // Ensure user has an id
    if (!userId) {
      console.warn('⚠️ No user ID found in localStorage userData');
      return null;
    }
    
    // Map API response fields to User interface if needed
    const mappedUser: User = {
      id: userId,
      email: userObj.email || '',
      name: userObj.name || '',
      business_id: userObj.business_id || '',
      // Map snake_case to camelCase if API returns snake_case
      companyName: userObj.companyName || userObj.company_name,
      tin: userObj.tin || userObj.tin_number,
      phoneNumber: userObj.phoneNumber || userObj.phone_number,
      is_sandbox: userObj.is_sandbox !== undefined ? userObj.is_sandbox : true,
      is_aggregator: userObj.is_aggregator !== undefined ? userObj.is_aggregator : false,
    };
    
    // Check if business_id is stored separately in localStorage
    const storedBusinessId = localStorage.getItem('userBusinessId');
    if (storedBusinessId && !mappedUser.business_id) {
      mappedUser.business_id = storedBusinessId;
    }
    
    return mappedUser;
  } catch (err) {
    console.error('❌ Error parsing user from storage:', err);
    return null;
  }
};

export const checkBusinessIdCompletion = (user: User | null): boolean => {
  if (!user) return false;
  
  const hasBusinessIdInData = user.business_id && user.business_id.trim() !== '';
  const storedBusinessId = localStorage.getItem('userBusinessId');
  // Business ID is mandatory (no skip)
  return hasBusinessIdInData || !!storedBusinessId;
};

export const saveUserToStorage = (user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem("userData", JSON.stringify(user));
};

export const saveBusinessIdToStorage = (businessId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem("userBusinessId", businessId);
};

export const clearBusinessIdSkip = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem("businessIdSkipped");
};

export const setBusinessIdSkipped = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem("businessIdSkipped", "true");
};

