/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define([
    'N/search', 
    './bsp_isg_lb_utils.js', 
    './bsp_isg_lb_ordersservice_api.js', 
    './bsp_isg_lb_cc_payments.js',
    './bsp_isg_lb_po_payments.js'
 ], 
 function (search, BSPLBUtils, LBOrdersAPI, BSPLBCCPayments, BSPLBPOPayments) {

    /**
     * 
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} transactionId 
     */
    function fetchPayments(settings, loginData, transactionId){
        let logicBlockPayments = [];

        let createdFromField = search.lookupFields({
            type: search.Type.INVOICE,
            id: transactionId,
            columns: ["createdfrom"]
        });
        let salesOrderID = null;
        if(createdFromField && createdFromField.createdfrom){
            salesOrderID = createdFromField.createdfrom[0].value;
        }

        let logicBlockOrderID = null;
        if(salesOrderID){
             logicBlockOrderID = BSPLBUtils.getLogicblockID(salesOrderID);
        }

        if(logicBlockOrderID){
            let paymentsResult = LBOrdersAPI.getOrderPayments(settings, loginData, logicBlockOrderID);
            if(paymentsResult){
                logicBlockPayments = paymentsResult;
            }
        }
        return logicBlockPayments;
    }

    /**
     * Process logicblock payments
     * @param {*} logicBlockPayments 
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} transactionId 
     * @param {*} transactionType 
     * @param {*} paymentObjMappingFields 
     * @returns 
     */
    function processPayments(logicBlockPayments, settings, loginData, transactionId, transactionType, paymentObjMappingFields){
        let processedPayments = null;
        if(transactionType == BSPLBUtils.constants().transactionTypeInv){
            processedPayments = BSPLBCCPayments.processCreditCardPayments(logicBlockPayments, settings, loginData, transactionId, paymentObjMappingFields);
        }else if(transactionType == BSPLBUtils.constants().transactionTypePayment){
            processedPayments = BSPLBPOPayments.processPuchaseOrderPayments(settings, loginData, transactionId);
        }
        return processedPayments;
    }

    return {
        fetchPayments: fetchPayments,
        processPayments: processPayments
	};

});