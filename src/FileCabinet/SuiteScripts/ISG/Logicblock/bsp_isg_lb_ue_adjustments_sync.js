/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', 'N/search', '../Lib/bsp_isg_lb_utils.js'],
 /**
 * @param{runtime} runtime
 * @param{search} search
 * @param{BSPLBUtils} BSPLBUtils
 */
    (runtime, search, BSPLBUtils) => {
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
            try {

                const ORDER_STATUSES = {
                  pendingFulfillment: "Pending Fulfillment",
                  open: "Open",
                  pendingApproval: "Pending Approval",
                }

                let clientScriptFileId = search
                  .create({
                    type: "file",
                    filters: [["name", "is", "bsp_isg_lb_adjustments_sync_actions.js"]],
                  })
                  .run()
                  .getRange({ start: 0, end: 1 });
          
                  scriptContext.form.clientScriptFileId = clientScriptFileId[0].id;
          
                if (scriptContext.type == "view") {
                  const salesOrder = scriptContext.newRecord;
                  let salesOrderId = salesOrder.id;

                  const orderCancelled = salesOrder.getValue('custbody_bsp_isg_lb_order_cancelled');
                  const orderStatus = salesOrder.getValue('status');

                  if(orderStatus == ORDER_STATUSES.open || orderStatus == ORDER_STATUSES.pendingApproval || orderStatus == ORDER_STATUSES.pendingFulfillment){
                    if(orderCancelled == false){   

                      if(!orderProcessed(salesOrderId)){
                        let logicblockId = BSPLBUtils.getLogicblockID(salesOrderId);     
                        let params = {
                          salesOrderId: salesOrderId,
                          logicblockId: logicblockId
                        }
                        scriptContext.form.addButton({
                          id: "custpage_cancel_order_lb",
                          label: "Cancel/Close Order",
                          functionName: 'cancelOrderLB(' + JSON.stringify(params) + ')'
                        });
  
                        scriptContext.form.addButton({
                          id: "custpage_sync_order_lb",
                          label: "Sync with Logicblock",
                          functionName: 'syncOrderLB(' + JSON.stringify(params) + ')'
                        });
                      }              
                    }      
                  }            
                }
            } catch (e) {
                log.error("beforeLoad", e.message);
            }         
        }

        const orderProcessed = (salesOrderId) => {
          const salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
            [
               ["type","anyof","SalesOrd"], 
               "AND", 
               ["internalid","anyof",salesOrderId], 
               "AND", 
               ["purchaseorder","noneof","@NONE@"], 
               "AND", 
               ["mainline","is","F"]
            ],
            columns:
            []
         });
         let searchResultCount = salesorderSearchObj.runPaged().count;
         log.debug("salesorder with PO SearchObj result count", searchResultCount);
         return (searchResultCount > 0);
        }

        return {beforeLoad}

    });
