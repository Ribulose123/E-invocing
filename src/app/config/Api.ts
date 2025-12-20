const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const API_END_POINT = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER: `${API_BASE_URL}/auth/register`,
        FORGOT_PASSWORD: `${API_BASE_URL}/auth/logout`,
        RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`
    },

    INVOICE: {
        CREAT_INVOICE: `${API_BASE_URL}/invoice/create`,
        GET_ALL_iNVOICE: `${API_BASE_URL}/invoice/business/{business_id}`,
        GET_INVOICE_DETAILS: `${API_BASE_URL}/invoice/business/{business_id}/{invoice_id}`,
        UPDATE_INVOICE: `${API_BASE_URL}/invoice/business/{business_id}/{invoice_id}`,
        DELETE_INVOICE: `${API_BASE_URL}/invoice/business/{business_id}/{invoice_id}`,
        DownLoad_Invoice: `${API_BASE_URL}/invoice/download/{irn}`,
        UPLOAD_INVOICE: `${API_BASE_URL}/invoice/upload`,
    }
};

