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
                if (scriptContext.type == scriptContext.UserEventType.DELETE) {
                    deleteCartonBuyRecords();
                }
            }catch(error){
                log.error(functionName, JSON.stringify(error.message));
            }
        }

        const deleteCartonBuyRecords = () => {
            const carton_buy_SearchObj = search.create({
                type: "customrecord_bsp_isg_carton_buy_item_so",
                filters:
                [
                   ["custrecord_bsp_isg_carton_buy_po","anyof","@NONE@"]
                ],
                columns:
                []
             });
             carton_buy_SearchObj.run().each(function(result){
                log.debug("Search result", JSON.stringify(result));
                record.delete({
                    type: "customrecord_bsp_isg_carton_buy_item_so",
                    id: result.id,
                });
                return true;
            });
        }

        return {afterSubmit}

    });
