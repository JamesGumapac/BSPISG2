/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {

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
                let type = scriptContext.type;
                if (type == scriptContext.UserEventType.CREATE 
                    || type == scriptContext.UserEventType.COPY
                    || type == scriptContext.UserEventType.EDIT) {

                        let tradingPartnerRec = scriptContext.newRecord;
                        let vendorID = tradingPartnerRec.getValue('custrecord_bsp_isg_tp_vendor');

                        let tradingPartnerInVendor = search.lookupFields({
                            type: "vendor",
                            id: vendorID,
                            columns: 'custentity_bsp_isg_trading_part_settings'
                        });

                        if(isEmpty(tradingPartnerInVendor.custentity_bsp_isg_trading_part_settings)){
                            record.submitFields({
                                type: "vendor",
                                id: vendorID,
                                values: {
                                    custentity_bsp_isg_trading_part_settings: tradingPartnerRec.id
                                },
                                 options: {        
                                     enableSourcing: false,        
                                     ignoreMandatoryFields : true    
                                }           
                            });
                        }            
                }
            }catch(error){
                log.error(functionName, {error: error.toString()});
            }
        }

        /**
         * Check for Empty value
         * @param {*} value 
         * @returns 
        */
        function isEmpty(value) {
            return (
                value === "" ||
                value == null ||
                value == undefined ||
                value == "null" ||
                value == "undefined" ||
                (value.constructor === Array && value.length == 0) ||
                (value.constructor === Object &&
                    (function (v) {
                        for (let k in v) return false;
                        return true;
                    })(value))
            );
        }

        return {afterSubmit}

    });
