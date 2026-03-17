const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
 
export const API_END_POINT = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        REGISTER: `${API_BASE_URL}/auth/register`,
        FORGOT_PASSWORD: `${API_BASE_URL}/auth/logout`,
        INITIATE_PASSWORD_RESET: `${API_BASE_URL}/auth/initiate-forgot-password`,
        COMPLETE_PASSWORD_RESET: `${API_BASE_URL}/auth/complete-forgot-password`,
        RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
        SANDBOX_PRODUCTION_MODE: `${API_BASE_URL}/auth/toggle-mode`,
        EMAIL_VERIFICATION: `${API_BASE_URL}/auth/verify-email`
    },

    INVOICE: {
        CREAT_INVOICE: `${API_BASE_URL}/invoice/create`,
        GET_ALL_iNVOICE: `${API_BASE_URL}/invoice`,
        GET_INVOICE_DETAILS: `${API_BASE_URL}/invoice/{invoice_id}`,
        UPDATE_INVOICE: `${API_BASE_URL}/invoice/business/{business_id}/{invoice_id}`,
        DELETE_INVOICE: `${API_BASE_URL}/invoice/business/{business_id}/{invoice_id}`,
        DownLoad_Invoice: `${API_BASE_URL}/invoice/download/{irn}`,
        UPLOAD_INVOICE: `${API_BASE_URL}/invoice/upload`,
    },
    BUSINESS: {
        UPDATE_BUSINESS: `${API_BASE_URL}/business/`,
        GET_BUSINESS_ID: `${API_BASE_URL}/business/{id}`,
        UPDATE_BUSINESS_ID: `${API_BASE_URL}/business/business_id`,
    }
};

