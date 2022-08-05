/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    
    const FREQUENCY_FIELDS = ["custrecord_bsp_lb_ts_months", "custrecord_bsp_lb_ts_day_of_month", "custrecord_bsp_lb_ts_time_of_day", "custrecord_bsp_lb_ts_weekdays"];

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        let currentRec = scriptContext.currentRecord;
        let frequency = currentRec.getValue('custrecord_bsp_lb_ts_frequency');
        try{
            for (let index = 0; index < FREQUENCY_FIELDS.length; index++) {
                let fieldElement = FREQUENCY_FIELDS[index];
                let field = currentRec.getField({ fieldId: fieldElement});
                field.isVisible = false;
                field.isDisplay = false;
            }
            if (frequency == '2'){
                let field = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                field.isVisible = true;
                field.isDisplay = true;
            }
            else if (frequency == '3'){
                let weekDaysfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_weekdays'});
                weekDaysfield.isVisible = true;
                weekDaysfield.isDisplay = false;
                let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                timefield.isVisible = true;
                timefield.isDisplay = true;
            }
            else if (frequency == '4'){
                let dayOfMonthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_day_of_month'});
                dayOfMonthfield.isVisible = true;
                dayOfMonthfield.isDisplay = true;
                let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                timefield.isVisible = true;
                timefield.isDisplay = true;
            }
            else if (frequency == '5'){
                let monthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_months'});
                monthfield.isVisible = true;     
                monthfield.isDisplay = true;
                let dayOfMonthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_day_of_month'});
                dayOfMonthfield.isVisible = true;
                dayOfMonthfield.isDisplay = true;
                let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                timefield.isVisible = true;
                timefield.isDisplay = true;
            }
        }catch(error){
            console.log("pageInit", error.message);
        } 
    }

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
        let currentRec = scriptContext.currentRecord;
        try{
            let name = scriptContext.fieldId;
            if (name == 'custrecord_bsp_lb_ts_frequency'){
                let frequency = currentRec.getValue('custrecord_bsp_lb_ts_frequency');
                for (let index = 0; index < FREQUENCY_FIELDS.length; index++) {
                    let fieldElement = FREQUENCY_FIELDS[index];
                    let field = currentRec.getField({ fieldId: fieldElement});
                    field.isVisible = false;
                    field.isDisplay = false;
                }
                if (frequency == 2){
                    let field = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                    field.isVisible = true;
                    field.isDisplay = true;
                }
                else if (frequency == 3){
                    let weekDaysfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_weekdays'});
                    weekDaysfield.isVisible = true;
                    weekDaysfield.isDisplay = true;
                    let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                    timefield.isVisible = true;
                    timefield.isDisplay = true;
                }
                else if (frequency == 4){
                    let dayOfMonthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_day_of_month'});
                    dayOfMonthfield.isVisible = true;
                    dayOfMonthfield.isDisplay = true;
                    let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                    timefield.isVisible = true;
                    timefield.isDisplay = true;
                }
                else if (frequency == 5){
                    let monthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_months'});
                    monthfield.isVisible = true;  
                    monthfield.isDisplay = true;             
                    let dayOfMonthfield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_day_of_month'});
                    dayOfMonthfield.isVisible = true;
                    dayOfMonthfield.isDisplay = true;
                    let timefield = currentRec.getField({ fieldId: 'custrecord_bsp_lb_ts_time_of_day'});
                    timefield.isVisible = true;
                    timefield.isDisplay = true;
                }
            }
        }catch(error){
            console.log("fieldChanged", error.message);
        } 
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
    
});
