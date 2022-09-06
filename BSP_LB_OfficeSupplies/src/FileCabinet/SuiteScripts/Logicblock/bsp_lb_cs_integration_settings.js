/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let currentRecord = scriptContext.currentRecord;
        try{
            if (scriptContext.fieldId == "custrecord_bsp_lb_undep_founds") {
                let undepositFounds = currentRecord.getValue("custrecord_bsp_lb_undep_founds");
                if(undepositFounds){
                    currentRecord.setValue({
                        fieldId: 'custrecord_bsp_lb_account',
                         value: "",
                        ignoreFieldChange: true
                    });
                }
            } 
        }catch(error){
            log.debug(error.message);
        }   
    }

    return {
        fieldChanged: fieldChanged       
    };
    
});
