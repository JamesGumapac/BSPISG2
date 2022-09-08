/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', './Lib/bsp_isg_trading_partners.js', './Lib/bsp_isg_purchase_orders.js'],
    /**
     * @param{runtime} runtime
     * @param{search} search
     * @param{BSPTradingParnters} BSPTradingParnters
     */
    (runtime, search, BSPTradingParnters, BSP_POutil) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let stLogTitle = 'beforeLoad';
            try {
                let type = scriptContext.type;
                if (type === scriptContext.UserEventType.VIEW){
                    let purchaseOrderRecord = scriptContext.newRecord;
                    let vendor = purchaseOrderRecord.getValue({
                        fieldId: 'entity'
                    });
                    if(BSPTradingParnters.isTradingPartner(vendor)){
                        let transmissionMsgID = purchaseOrderRecord.getValue({
                            fieldId: 'custbody_bsp_isg_transmission_msg_id'
                        });
                        if(!transmissionMsgID){
                            let transmissionStatusID = purchaseOrderRecord.getValue({
                                fieldId: 'custbody_bsp_isg_po_transm_status'
                            });
                            if(transmissionStatusID == BSP_POutil.transmitionPOStatus().pendingTransmission 
                                || transmissionStatusID == BSP_POutil.transmitionPOStatus().transmissionFailed){

                                let transmissionQueueID = purchaseOrderRecord.getValue({
                                    fieldId: 'custbody_bsp_isg_transm_queue_id'
                                });
                                if(!transmissionQueueID){
                                    let currentForm = scriptContext.form;
                                    let clientScriptId = runtime.getCurrentScript().getParameter('custscript_bsp_isg_client_po_btn');
                                    currentForm.clientScriptFileId = clientScriptId;
                                    currentForm.addButton({
                                        id: 'custpage_btn_isg_transmit_po',
                                        label: 'Transmit PO',
                                        functionName: 'transmitPO("'+purchaseOrderRecord.id+'")'
                                    });
                                }
                            }                          
                        }
                    }
                }
            } catch (error) {
                log.error(stLogTitle, JSON.stringify(error));
            };
        }

        return {beforeLoad}

    });
