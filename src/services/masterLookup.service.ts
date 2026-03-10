import axios from 'axios';
import { api } from '../lib/api';
import type { MasterLookupResponse } from '../types/masterLookup';

export const masterlookupService = {
    async getMasterLookups(): Promise<MasterLookupResponse[]> {
        const { data } = await axios.get<MasterLookupResponse[]>(api.masterLookups.list)
        return data
    },

  
};
