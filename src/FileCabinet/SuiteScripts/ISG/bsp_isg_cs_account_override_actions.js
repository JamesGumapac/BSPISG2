/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    
    const DEPENDS_ON_DELIVERY_ZONE = 3;
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
        let fieldId = scriptContext.fieldId;
        let currentRec = scriptContext.currentRecord; 
        try{
            if(fieldId == 'custrecord_bsp_isg_acct_address'){
                let address = currentRec.getValue({fieldId: 'custrecord_bsp_isg_acct_address'});
                let accountTypeField = scriptContext.currentRecord.getField('custrecord_bsp_isg_account_type');
                if(address){
                    currentRec.setValue({
                        fieldId: 'custrecord_bsp_isg_account_type',
                        value: DEPENDS_ON_DELIVERY_ZONE
                    });
                    
                    accountTypeField.isDisabled = true;
                }else{
                    currentRec.setValue({
                        fieldId: 'custrecord_bsp_isg_account_type',
                        value: ''
                    });
                    accountTypeField.isDisabled = false;
                }
            }
        }catch(error){
            console.log("fieldChanged", `Error: ${error.toString()}`);
        }
    }

    return {
        fieldChanged: fieldChanged
    };
    
});
