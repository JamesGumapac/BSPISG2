/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['./lib/bsp_lb_utils.js'],
    
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

                if(transactionType == BSPLBUtils.recTypes().itemFulfillment){
                    let recType = rec.getValue(BSPLBUtils.constants().transactionTypeField);  
                    let status = rec.getValue(BSPLBUtils.constants().itemFulfillmentShipStatus);

                    let createdFrom = rec.getValue("createdfrom");
                    let isLogicBlockOrder = BSPLBUtils.logicBlockOrder(createdFrom);

                    if(isLogicBlockOrder && status == BSPLBUtils.constants().shipstatus){
                        BSPLBUtils.createOutboundQueue(recId, recType);
                    }                        
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

        return {afterSubmit}

    });
