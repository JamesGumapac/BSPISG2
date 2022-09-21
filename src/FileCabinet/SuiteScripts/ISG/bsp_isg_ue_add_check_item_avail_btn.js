/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
const bsp_isg_cs_item_avail_function = 3076139
define(['N/https', 'N/ui/message', 'N/ui/serverWidget', 'N/url'],
    /**
     * @param{https} https
     * @param{message} message
     * @param{serverWidget} serverWidget
     * @param{url} url
     */
    (https, message, serverWidget, url) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */

        const beforeLoad = (context) => {
            let stLogTitle = 'beforeLoad';
            context.form.clientScriptFileId = bsp_isg_cs_item_avail_function;
            try {
                let itemRec = context.newRecord;
                if(context.type == 'view'){
                    context.form.addButton({
                        id: 'custpage_check_item_availability',
                        label:'SPR Check Item Availability',
                        functionName: 'openSuitelet()'

                    })
                }
            } catch (e) {
                log.error(stLogTitle, JSON.stringify(e))
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad}

    });
