/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/search",
  "N/ui/dialog",
  "N/ui/message",
  "./Lib/bsp_isg_elite_extra_create_order.js",
], function (search, dialog, message, BSPExliteExtra) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

  /**
   * check if tracking number is existing to prompt user for confirmation to re-upload order details if it is existing
   *@param {*}eliteExtraId
   *@param {*} ifId
   */
  function validateTrackingInformation(ifId, eliteExtraId) {
    const trackingNumberSearch = search.lookupFields({
      type: "itemfulfillment",
      id: ifId,
      columns: ["custbody_bsp_isg_tracking_number"],
    });
    
    if (
      !BSPExliteExtra.isEmpty(trackingNumberSearch.custbody_bsp_isg_tracking_number)
    ) {
      let options = {
        title: "Order already exists. Do you want to re-upload it?",
        message: "Press OK or Cancel",
      };

      function success(result) {
        if (result === true) {
          alert("Uploading Order Please wait...");
          const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
          showResponseToUser(response);
        }
      }

      dialog.confirm(options).then(success);
    } else {
      alert("Uploading Order Please wait...");
      const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
      showResponseToUser(response);
    }
  }
  /**
   * Show response to the user if the was successfully uploaded or not
   * @param {*} response
   */
  function showResponseToUser(response) {
    if (response[0].failed == false) {
      const infoMessage = message.create({
        title: "CONFIRMATION",
        message: response[0].message,
        type: message.Type.CONFIRMATION,
      });
      infoMessage.show();
    } else {
      const infoMessage = message.create({
        title: "FAILED",
        message: response[0].message,
        type: message.Type.ERROR,
      });
      infoMessage.show();
    }
  }


  return {
    pageInit: pageInit,
    validateTrackingInformation: validateTrackingInformation,
  };
});
