export interface SearchMemberResponse {
    id : number;
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber: string;
    altPhone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    centerId?: number;
    branchId?: number;
    aadhaar?: string;
    occupation?: string;
    relationship?: string;
    dOB?: Date;
    age?: number;
    guardianFirstName?: string;
    guardianMiddleName?: string;
    guardianLastName?: string;
    guardianPhone?: string;
    guardianDOB?: Date;
    guardianAge?: number;
    pocId?: number;
    center?: string
    poc?: string 
    guardianName: string  
    name: string 
    fullAddress: string
}