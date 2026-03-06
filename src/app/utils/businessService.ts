import { User } from "../type";
import { API_END_POINT } from "../config/Api";

export interface UpdateBusinessPayload {
  business_id?: string;
  tin?: string;
  company_name?: string;
  phone_number?: string;
}

export const updateBusinessProfile = async (
  _userId: string,
  payload: UpdateBusinessPayload
): Promise<any> => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Authentication token not found. Please login again.');
  }

  // Backend endpoint identifies the business/user from the auth token.
  // We keep the userId param for call-site compatibility, but it is not needed here.
  void _userId;

  const response = await fetch(API_END_POINT.BUSINESS.UPDATE_BUSINESS_ID, {
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

