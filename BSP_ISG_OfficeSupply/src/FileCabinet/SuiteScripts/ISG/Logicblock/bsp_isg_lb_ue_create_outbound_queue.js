/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../Lib/bsp_isg_lb_utils.js'],
    
    (BSPLBUtils) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let functionName = "afterSubmit";
            try{
                let rec = scriptContext.newRecord;
                let recId = rec.id;
                let transactionType = rec.type; 
                let recType = rec.getValue(BSPLBUtils.constants().transactionTypeField);  
                let createdFrom = null;
                let isLogicBlockOrder = null;
                let logicblockOrderData = null;
                switch (transactionType) {
                    case BSPLBUtils.recTypes().itemFulfillment:
                        let status = rec.getValue(BSPLBUtils.constants().itemFulfillmentShipStatus);
                        createdFrom = rec.getValue("createdfrom");
                        logicblockOrderData = BSPLBUtils.logicBlockOrderData(createdFrom);
                        isLogicBlockOrder = logicblockOrderData.custbody_bsp_isg_lb_order_number ? true : false;
                        if(isLogicBlockOrder && status == BSPLBUtils.constants().shipstatus){
                            BSPLBUtils.createOutboundQueue(recId, recType, BSPLBUtils.outboundQueueOperations().shipPackage);
                        }    
                        break;
                    case BSPLBUtils.recTypes().invoice:
                        createdFrom = rec.getValue("createdfrom");
                        logicblockOrderData = BSPLBUtils.logicBlockOrderData(createdFrom);              
                        isLogicBlockOrder = logicblockOrderData.custbody_bsp_isg_lb_order_number ? true : false;
                        if(isLogicBlockOrder){
                            //BSPLBUtils.createOutboundQueue(recId, recType, BSPLBUtils.outboundQueueOperations().sendInvoice);
                            let orderPaymentMethod = logicblockOrderData.custbody_bsp_isg_lb_payment_method;
                            if(orderPaymentMethod == BSPLBUtils.constants().creditCard){
                                BSPLBUtils.createOutboundQueue(recId, recType, BSPLBUtils.outboundQueueOperations().processPayment);
                            }
                        }  
                        break;
                    case BSPLBUtils.recTypes().customerPayment:
                        logicblockOrderData = getLogicBlockDataFromPayment(rec);
                        isLogicBlockOrder = logicblockOrderData.custbody_bsp_isg_lb_order_number ? true : false;
                        let orderPaymentMethod = logicblockOrderData.custbody_bsp_isg_lb_payment_method;
                        if(isLogicBlockOrder && orderPaymentMethod == BSPLBUtils.constants().purchaseOrder){
                            BSPLBUtils.createOutboundQueue(recId, recType, BSPLBUtils.outboundQueueOperations().processPayment);                 
                        }  
                        break
                }
            }catch (error){
                log.error(functionName, {error: error.message});
                let errorSource = "BSP | LB | UE | Create Outbound Queue - " + functionName;
                BSPLBUtils.createErrorLog(
                    errorSource,
                    error.message,
                    error
                );
            }
        }

        /**
         * Get LogicBlock Order data from linked Payment
         * @param {*} rec 
         * @returns 
         */
        const getLogicBlockDataFromPayment = (rec) => {
            let logicblockOrderData = null;
            let createdFrom = rec.getSublistValue({
                sublistId: 'apply',
                fieldId: 'createdfrom',
                line: 0
            });
            if(createdFrom){
                logicblockOrderData = BSPLBUtils.logicBlockOrderData(createdFrom);
            }
            return logicblockOrderData;
        }

        return {afterSubmit}

    });
