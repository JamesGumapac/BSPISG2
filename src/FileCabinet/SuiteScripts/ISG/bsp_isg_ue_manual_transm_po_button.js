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
                        let transmissionStatusID = purchaseOrderRecord.getValue({
                            fieldId: 'custbody_bsp_isg_po_transm_status'
                        });
                        if(showBtn(transmissionMsgID,transmissionStatusID)){
                            let transmissionQueueID = purchaseOrderRecord.getValue({
                                fieldId: 'custbody_bsp_isg_transm_queue_id'
                            });
                            if(!transmissionQueueID){
                                let currentForm = scriptContext.form;

                                let clientScriptFileId = search.create({
                                    type: "file",
                                    filters: [["name", "is", "bsp_isg_cs_manual_transm_po_btn_action.js"]],
                                }).run().getRange({ start: 0, end: 1 })[0].id;

                                currentForm.clientScriptFileId = clientScriptFileId;
                                currentForm.addButton({
                                    id: 'custpage_btn_isg_transmit_po',
                                    label: 'Transmit PO',
                                    functionName: 'transmitPO("'+purchaseOrderRecord.id+'")'
                                });
                            }
                        }                          
                        
                    }
                }
            } catch (error) {
                log.error(stLogTitle, JSON.stringify(error));
            };
        }


        const showBtn = (transmissionMsgID, transmissionStatusID) => {
            if(!transmissionMsgID 
                && (transmissionStatusID == BSP_POutil.transmitionPOStatus().pendingTransmission 
                    || transmissionStatusID == BSP_POutil.transmitionPOStatus().transmissionFailed)){
                        return true;
            }

            if(transmissionMsgID && transmissionStatusID == BSP_POutil.transmitionPOStatus().acknowledgmentFailed){
                return true;
            }
            return false;
        }

        return {beforeLoad}

    });
