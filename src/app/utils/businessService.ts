import { User } from "../type";
import { API_END_POINT } from "../config/Api";
import { handleUnauthorized } from "./authHelpers";

export interface UpdateBusinessPayload {
  business_id?: string;
  tin?: string;
  company_name?: string;
  phone_number?: string;
}

export interface BusinessProfileResponse {
  id?: string;
  name?: string;
  email?: string;
  business_id?: string;
  tin?: string;
  company_name?: string;
  phone_number?: string;
  [key: string]: unknown;
}

/** Fetch business/user profile from GET /business/{id} */
export const getBusinessProfile = async (userId: string): Promise<BusinessProfileResponse> => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const url = API_END_POINT.BUSINESS.GET_BUSINESS_ID.replace("{id}", userId);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401 || response.status === 403) {
    handleUnauthorized();
    throw new Error("Your session has expired. Please login again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch business profile");
  }

  const json = await response.json();
  const data = json.data ?? json;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    business_id: data.business_id ?? data.businessId,
    tin: data.tin,
    company_name: data.company_name ?? data.companyName,
    phone_number: data.phone_number ?? data.phoneNumber,
    ...data,
  };
};

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

  if (response.status === 401 || response.status === 403) {
    handleUnauthorized();
    throw new Error('Your session has expired. Please login again.');
  }

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

