/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', 'N/search', './bsp_lb_utils.js', './bsp_lb_ordersservice_api.js'], function (record, search, BSPLBUtils, LBOrdersAPI) {

    /**
     * Create Payment Record in NetSuite
     * @param {*} objFields 
     * @param {*} objMappingFields 
     * @returns 
     */
    function createPaymentRecord(objFields, objMappingFields, settings){
        let objResult = {};
        let status = BSPLBUtils.constants().successStatus;
        let newRecordId = "";

        log.debug("createPaymentRecord", 
            {
                objFields: JSON.stringify(objFields)
            }
        );
        let invoiceID = objFields.payment.transactionId;

        let paymentRec = record.transform({
            fromType: record.Type.INVOICE,
            fromId: invoiceID,
            toType: record.Type.CUSTOMER_PAYMENT,
            isDynamic: true,
        });

        let account = settings.custrecord_bsp_lb_account[0].value;
        if(account){
            transactionRecord.setValue({ fieldId: "account", value: account});
        }else{
            transactionRecord.setValue({ fieldId: "undepfunds", value: 'T'});
        }

        for (const fieldMapping of objMappingFields.bodyFields) {
            let nsField = fieldMapping.netSuiteFieldId;
            let lbField = fieldMapping.lbFieldId;
            let isLineItem = fieldMapping.isLineItem;
            let fieldDataType = fieldMapping.lbFieldDataType;
            let defaultValue = fieldMapping.defaultValue;
            let lbValue = BSPLBUtils.getProp(objFields, lbField);

            log.debug("createTransactionRecord", 
                {
                    objMappingFields: JSON.stringify(fieldMapping),
                    lbValue: lbValue
                }
            );

            if (isLineItem == "F" || (isLineItem == false && nsField)) {
                if(!BSPLBUtils.isEmpty(lbValue)){
                    if(fieldDataType == "String"){
                        paymentRec.setValue({ fieldId: nsField, value: lbValue });
                    }else if(fieldDataType == "Date"){
                        let ddate = lbValue;
                        ddate = BSPLBUtils.convertResponseDateToNSDate(ddate);
                        paymentRec.setValue({ fieldId: nsField, value: ddate });
                    }else if(fieldDataType == "Integer"){               
                        paymentRec.setValue({ fieldId: nsField, value: parseInt(lbValue) });                       
                    } else if(fieldDataType == "Double"){               
                        paymentRec.setValue({ fieldId: nsField, value: parseFloat(lbValue) });                       
                    }                                
                }else{
                    if(!BSPLBUtils.isEmpty(defaultValue)){
                        paymentRec.setValue({
                            fieldId: nsField,
                            value: defaultValue
                        })
                    } 
                }                              
            }
        }

        newRecordId = paymentRec.save();
        BSPLBUtils.createMappingKeyRecord(newRecordId, record.Type.CUSTOMER_PAYMENT, objFields.payment.paymentId, "OrderPayment");

        objResult = {
            status: status,
            recordId: newRecordId,
        };
        
        return objResult;
    }

    /**
     * Process Logicblock Credit Card Payment in NetSuite
     * @param {*} logicBlockPayments 
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} transactionId 
     * @param {*} objMappingFields 
     * @returns 
     */
    function processCreditCardPayments(logicBlockPayments, settings, loginData, transactionId, objMappingFields){
        let functionName = "processCreditCardPayments";
        let netSuitePayment = [];

        let creditCardPayments = logicBlockPayments.filter((lbPayment) => lbPayment.PaymentMethodName == BSPLBUtils.constants().creditCard);
        
        let netSuitePaymentsData = [];
        creditCardPayments.forEach(lbPayment => {
            let paymentId = lbPayment.Id;
            let paymentAmount = (parseFloat(lbPayment.AmountAuthorized)).toFixed(1);

            let paymentData = {paymentId: paymentId, paymentAmount: paymentAmount};
            let capturePayment = LBOrdersAPI.capturePayment(settings, loginData, paymentData);
            if(capturePayment == "true"){
                let paymentDate = lbPayment.AuditDate;
                netSuitePaymentsData.push({
                    transactionId: transactionId,
                    paymentId: paymentId,
                    paymentAmount: paymentAmount,
                    paymentDate: paymentDate
                });
            }else{
                netSuitePayment.push({
                    error: BSPLBUtils.constants().errorCapturePayment,
                    netsuiteId: null,
                    logicblockId: paymentId
                })
            }        
        });

        try{   
            netSuitePaymentsData.forEach(paymentData => {
                let objFields = {
                    payment: paymentData
                }
                let recordCreationResult = createPaymentRecord(objFields, objMappingFields, settings);
                if(recordCreationResult && recordCreationResult.recordId){
                    internalId = recordCreationResult.recordId;
                    netSuitePayment.push({
                        error: null,
                        netsuiteId: internalId,
                        logicblockId: paymentData.paymentId
                    });
                }    
            });
        }catch(error){
            log.error(functionName, {error: error.message});
            let errorDetail = JSON.stringify({error: error.message})
            let errorSource = "BSP | LB | MR | Create NS Records - " + functionName;
            BSPLBUtils.createErrorLog(
                errorSource,
                error.message,
                errorDetail
            );
        }  
        return netSuitePayment;    
    }   

    return {
        processCreditCardPayments: processCreditCardPayments
	};

});