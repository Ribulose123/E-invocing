const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const API_END_POINT ={
    AUTH:{
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER:`${API_BASE_URL}/auth/register`
    }
} 