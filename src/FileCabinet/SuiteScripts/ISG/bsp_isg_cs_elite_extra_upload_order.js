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

  function sendOrderDetails(ifId, eliteExtraId) {
    const trackingNumberSearch = search.lookupFields({
      type: "itemfulfillment",
      id: ifId,
      columns: ["custbody_bsp_tracking_number"],
    });
    console.log(trackingNumberSearch);
    if (
      !BSPExliteExtra.isEmpty(trackingNumberSearch.custbody_bsp_tracking_number)
    ) {
      let options = {
        title: "Order already exists. Do you want to re-upload it?",
        message: "Press OK or Cancel",
      };

      function success(result) {
        console.log("result" + result);
        if (result == true) {
          uploadOrder(ifId, eliteExtraId);
        }
      }

      function failure(result) {
        console.log("result" + result);
      }

      dialog.confirm(options).then(success).catch(failure);
    } else {
      uploadOrder(ifId, eliteExtraId);
    }
  }

  function uploadOrder(ifId, eliteExtraId) {
    alert("Uploading Order Please wait...");
    const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
    showMessage(response);
  }

  function showMessage(response) {
    if (response[0].failed == false) {
      const infoMessage = message.create({
        title: "CONFIRMATION",
        message: "Orders has been uploaded successfully",
        type: message.Type.CONFIRMATION,
      });
      infoMessage.show();
    } else {
      const infoMessage = message.create({
        title: "FAILED",
        message: "Failed to upload order",
        type: message.Type.ERROR,
      });
      infoMessage.show();
    }
  }

  return {
    pageInit: pageInit,
    sendOrderDetails: sendOrderDetails,
  };
});
