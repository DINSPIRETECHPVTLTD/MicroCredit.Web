import axios from 'axios';
import { api } from '../lib/api';
import type { PaymentTermResponse } from '../types/paymentTerm';

export const paymentTermService = {
    async getPaymentTerms(): Promise<PaymentTermResponse[]> {
        const { data } = await axios.get<PaymentTermResponse[]>(api.paymentTerms.list)
        return data
    },


};
