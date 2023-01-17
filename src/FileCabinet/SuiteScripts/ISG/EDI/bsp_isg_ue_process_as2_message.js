/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/record',
    '../Lib/bsp_isg_trading_partners.js',
    '../Lib/bsp_isg_purchase_orders.js'],
    /**
     * @param{record} record
     * @param{BSPTradingParnters} BSPTradingParnters
     * @param{BSP_POutil} BSP_POutil
    */
    (record, BSPTradingParnters, BSP_POutil) => {

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let scriptEventType = scriptContext.type;
            try{
                if (scriptEventType == scriptContext.UserEventType.CREATE) {
                    processAS2Message(scriptContext);
                }
                if (scriptEventType == scriptContext.UserEventType.EDIT) {
                    let objNewRecord = scriptContext.newRecord;
                    let errorMessage = objNewRecord.getValue({fieldId: 'custrecord_bsp_isg_error_message'});
                    if(errorMessage){
                        processAS2Message(scriptContext);
                    }
                }
            }catch(e)
            {
                log.error("processAS2Message", JSON.stringify(e));

                let objNewRecord = scriptContext.newRecord;
                let recId = objNewRecord.id;
                let recType = objNewRecord.type;
                let rec = record.load({id: recId, type: recType});

                e = e.type ? e.message : e;
                rec.setValue({ fieldId: "custrecord_bsp_isg_error_message", value: JSON.stringify(e) }); 
                rec.save({ignoreMandatoryFields: true});
                log.debug("processAS2Message", '*** SCRIPT EXECUTION COMPLETE ***');
            }
        }


        const processAS2Message = (scriptContext) => {
            log.debug("processAS2Message", '*** START SCRIPT EXECUTION ***');
            let objNewRecord = scriptContext.newRecord;
            let tradingPartner = objNewRecord.getValue({fieldId: 'custrecord_bsp_isg_trading_partner'});
            let messageType = objNewRecord.getValue({fieldId: 'custrecord_bsp_isg_message_type'});
            let payload = JSON.parse(objNewRecord.getValue({fieldId: 'custrecord_bsp_isg_payload'}));

            if(messageType == "Acknowledgment"){
                let result = null;
                result = BSPTradingParnters.processPOAck(payload, tradingPartner);
                           
                /**
                 * Update Transmission Status for Manual POs
                */
                if(result && !result.queueID && result.status == "Error"){
                    BSP_POutil.updatePOtransmissionStatus(result.poID, BSP_POutil.transmitionPOStatus().acknowledgmentFailed);
                    log.debug(functionName, `Error in Manual PO Acknowledgment`);
                }

            }else if(messageType == "ASN"){
                BSPTradingParnters.processASN(payload, tradingPartner);
            }else if(messageType == "Invoice"){
                BSPTradingParnters.processInvoice(payload, tradingPartner);
            }  
            
            let recId = objNewRecord.id;
            let recType = objNewRecord.type;
            record.delete({
                type: recType,
                id: recId,
            });
            log.debug("processAS2Message", 'Record deleted: ' + recId);
            log.debug("processAS2Message", '*** SCRIPT EXECUTION COMPLETE ***');
        }

        return {afterSubmit}

    });
