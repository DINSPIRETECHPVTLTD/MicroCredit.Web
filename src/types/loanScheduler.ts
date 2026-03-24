export type LoanSchedulerResponse = {
    LoanschedulerId: number;
    LoanID: number;
    ScheduleDate: Date; // collection date
    PaymentDate: Date; // paid date
    ActualEmiAmount: number;
    ActualPrincipalAmount: number;
    ActualInterestAmount: number;
    Status: string; //payment status
    Comments: string; //reasons
    PaymentMode: string; //payment mode
    InstallmentNo: number; //week number
    PaymentAmount: number; //paid amount
    PrincipalAmount: number;
    InterestAmount: number;

};


   
                                                                  