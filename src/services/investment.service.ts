import axios from 'axios';
import { api } from '../lib/api';
import type { InvestmentResponse } from '../types/investment';

export const investmentService = {
    async getInvestments(): Promise<InvestmentResponse[]> {
        const { data } = await axios.get<InvestmentResponse[]>(api.investments.list)
        console.log('Fetched investments:', data); // Debug log to check fetched data
        return data
    }
};