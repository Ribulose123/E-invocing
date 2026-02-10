import { User } from "../type";
import { API_END_POINT } from "../config/Api";

export interface UpdateBusinessPayload {
  business_id?: string;
  tin?: string;
  company_name?: string;
  phone_number?: string;
}

export const updateBusinessProfile = async (
  userId: string,
  payload: UpdateBusinessPayload
): Promise<any> => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Authentication token not found. Please login again.');
  }

  const response = await fetch(`${API_END_POINT.BUSINESS.UPDATE_BUSINESS}${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update business profile');
  }

  return response.json();
};

export const updateBusinessId = async (
  userId: string,
  businessId: string
): Promise<any> => {
  return updateBusinessProfile(userId, { business_id: businessId });
};

