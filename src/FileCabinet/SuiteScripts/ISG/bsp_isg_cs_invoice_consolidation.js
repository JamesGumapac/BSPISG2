/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/url", "N/ui/message", "N/record", "N/search"], /**
 * @param{url} url
 * @param{message} message
 * @param record
 * @param search

 */ function (url, message, record, search,) {
  let suitelet = null;

  function pageInit(scriptContext) {
    let logTitle = "pageInit";
    try {
      suitelet = scriptContext.currentRecord;

      selectAllSublist(suitelet);
      let arrTemp = window.location.href.split('?');
      let urlParams = new URLSearchParams(arrTemp[1]);
      suitelet.setValue({
        fieldId: "custpage_date_filter",
        value: urlParams.get('custparam_month'),
        ignoreFieldChange: true
      })

    } catch (error) {
      console.log(logTitle, error.message);
    }
  }

  function fieldChanged(scriptContext) {

    try {
      if (
          scriptContext.fieldId == "custpage_customer" ||
          scriptContext.fieldId == "custpage_date_filter"
      ) {
        let selectedCustomerId = suitelet.getValue({
          fieldId: "custpage_customer",
        });
        let month = suitelet.getValue({
          fieldId: "custpage_date_filter",
        });
        let customerText = suitelet.getText({
          fieldId: "custpage_customer",
        });
        let email;
        if (selectedCustomerId) {
          email = search.lookupFields({
            type: record.Type.CUSTOMER,
            id: selectedCustomerId,
            columns: ["email"],
          });
          console.log("email" + email[0]);
          suitelet.setValue({
            fieldId: "custpage_email",
            value: email.email,
          });
        }

        let parameters = {
          custparam_customerSelected: selectedCustomerId,
          custparam_customerSelectedText: customerText,
          custparam_month: month,
          custparam_email: email.email,
        };
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_bsp_isg_sl_inv_consolidate",
          deploymentId: "customdeploy_bsp_isg_sl_consolidat_inv",
          returnExternalUrl: false,
          params: parameters,
        });
        if (!isEmpty(selectedCustomerId) && !isEmpty(month)) {
          window.ischanged = false;
          window.open(stSuiteletUrl, "_self");
        }
      }


    } catch (error) {
    }
  }


  function selectAllSublist(suitelet) {
    let itemCount = suitelet.getLineCount({
      sublistId: "custpage_items_sublist",
    });

    let selectedItemsArray = [];
    let totalAmountRemaining = 0.0;
    let totalAmount = 0.0;
    let totalTaxAmount = 0.0;
    for (let index = 0; index < itemCount; index++) {
      let currentLine = suitelet.selectLine({
        sublistId: "custpage_items_sublist",
        line: index,
      });
      currentLine.setCurrentSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_item_selected",
        value: true,
      });

      let selectedItemID = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_invoice_id",
        line: index,
      });
      let department = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_department",
        line: index,
      });
      let taxAmount = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_tax_amount",
        line: index,
      });
      let amountRemaining = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_amount_remaining",
        line: index,
      });

      let amount = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_amount",
        line: index,
      });
      let attentionName = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_attention",
        line: index,
      });
      totalAmountRemaining += parseFloat(amountRemaining);
      totalAmount += parseFloat(amount);
      totalTaxAmount += parseFloat(taxAmount);
      selectedItemsArray.push({
        invoiceId: selectedItemID,
        department: department,
        amountRemaining: amountRemaining,
        amount: amount,
        tax: taxAmount,
        attentionName: attentionName,
      });
    }

    suitelet.setValue({
      fieldId: "custpage_item_queue",
      value: JSON.stringify(selectedItemsArray),
    });
    suitelet.setValue({
      fieldId: "custpage_total_amount_remaining",
      value: `$${totalAmountRemaining.toFixed(2)}`,
    });
    suitelet.setValue({
      fieldId: "custpage_invoice_total_amount",
      value: `$${totalAmount.toFixed(2)}`,
    });
    suitelet.setValue({
      fieldId: "custpage_tax_total_amount",
      value: `$${totalTaxAmount.toFixed(2)}`,
    });
  }

  function saveRecord(scriptContext) {
    const email = suitelet.getText({
      fieldId: "custpage_email",
    });
    const deploymentId = suitelet.getValue({
      fieldId: "custpage_deployment_id"
    })

    return instanceChecker(deploymentId,email)
  }


  /**
   * check if there still an existing instance running on the backend.
   * @param deploymentId
   * @param email
   * @returns {boolean}
   */
  function instanceChecker(deploymentId, email) {
    const scheduledscriptinstanceSearchObj = search.create({
      type: "scheduledscriptinstance",
      filters:
          [
            ["scriptdeployment.scriptid", "is", deploymentId],
            "AND",
            ["status", "anyof", "PROCESSING"]],

    })
    const checkInstCount = scheduledscriptinstanceSearchObj.runPaged().count;

    if (checkInstCount) {
      alert('There is a current process runnning on the backend. Kindly wait for a few minutes before sending summary invoice');
      return false;
    } else {
      alert("Generating Summary Invoice. File will be sent to " + email + " once completed. ");
      return true
    }
  }

  function isEmpty(value) {
    let stLogTitle = "isEmpty";
    try {
      if (value == null || value == "" || !value || value == "undefined") {
        return true;
      }
      return false;
    } catch (error) {
      console.log(stLogTitle, error);
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord,
  };
});
