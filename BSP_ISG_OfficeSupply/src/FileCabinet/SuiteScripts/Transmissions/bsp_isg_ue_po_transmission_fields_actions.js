/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget'],
    /**
     * @param{serverWidget} serverWidget
    */
    (serverWidget) => {
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
            let functionName = "beforeLoad";
            try{
                let purchaseOrderRec = scriptContext.newRecord;
                let messageID = purchaseOrderRec.getValue('custbody_bsp_isg_transmission_msg_id');
                if(messageID){
                    let form = scriptContext.form;

                    form.getField({
                        id : 'custbody_bsp_isg_autoreceived'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    form.getField({
                        id : 'custbody_bsp_isg_transmission_acct_num'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    form.getField({
                        id : 'custbody_bsp_isg_transmission_loc'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    form.getField({
                        id : 'custbody_bsp_isg_po_transm_status'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });
                }
            }catch(error){
                log.error(functionName, JSON.stringify(error));
            }
        }

        return {beforeLoad}

    });
