/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', 'N/search', './bsp_lb_utils.js', './bsp_lb_ordersservice_api.js'], function (record, search, BSPLBUtils, LBOrdersAPI) {


    /**
     * Get LogicBlock Order data from linked Payment
     * @param {*} transactionId 
     * @returns 
    */
    function getPaymentDataforLogicBlock(transactionId){
        let paymentData = null;

        let rec = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: transactionId
        });

        let createdFrom = rec.getSublistValue({
            sublistId: 'apply',
            fieldId: 'createdfrom',
            line: 0
        });
        if(createdFrom){
            let logicblockOrderData = BSPLBUtils.logicBlockOrderData(createdFrom);
            let orderId = BSPLBUtils.getLogicblockID(createdFrom);
            let paymentDate = new Date().toISOString();
            let paymentAmount = rec.getValue('payment');
            paymentData = {
                orderId: orderId,
                amountCharged: paymentAmount,
                auditDate: paymentDate,
                purchaseOrderNumber: logicblockOrderData.custbody_bsp_lb_purchase_order_num
            }
            
        }
        return paymentData;
    }

    /**
     * Update NetSuite Payment with Logicblock Payment ID
     * @param {*} logicBlockPOPayment 
     * @param {*} transactionId 
     */
    function updateNetSuitePayment(logicBlockPOPayment, transactionId){
        log.debug("updateNetSuitePayment", {logicBlockPOPayment: logicBlockPOPayment, transactionId: transactionId});
        let rec = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: transactionId,
            isDynamic: true,
        });
        rec.setValue({
            fieldId: "custbody_bsp_lb_po_payment",
            value: logicBlockPOPayment
        });
        rec.save();
    }   

    /**
     * Create logicBlock PO Payment from NetSuite Customer Payment
     * @param {*} transactionId 
     * @returns 
     */
    function processPuchaseOrderPayments(settings, loginData, transactionId){
        let functionName = "processPuchaseOrderPayments";
        let logicBlockPayment = null;
        let errorDetail = null;
        try{
            let paymentData = getPaymentDataforLogicBlock(transactionId);
            log.debug("processPuchaseOrderPayments", {paymentData});
            logicBlockPayment = LBOrdersAPI.addPOPayment(settings, loginData, paymentData);
            if(logicBlockPayment){
                updateNetSuitePayment(logicBlockPayment, transactionId);
            }
    
            return {
                error: null,
                netsuiteId: transactionId,
                logicblockId: logicBlockPayment
            };    
        }catch(error){
            log.error(functionName, JSON.stringify(error));
            errorDetail = JSON.stringify({error: error.message})
            let errorSource = "BSP | LB | MR | Process Payments - " + functionName;
            BSPLBUtils.createErrorLog(
                errorSource,
                error.message,
                JSON.stringify(error)
            );
        }  
        return {
            error: errorDetail,
            netsuiteId: transactionId,
            logicblockId: logicBlockPayment
        };    
    }   

    return {
        processPuchaseOrderPayments: processPuchaseOrderPayments
	};

});