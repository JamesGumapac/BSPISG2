/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "./Lib/bsp_isg_consolidate_inv.js"], (runtime, util) => {
  const getInputData = (inputContext) => {
    try {
      log.audit("*******GetInputData STARTING*******");
      let customer = [];
      let params = getParameters();
      if (params.customer) {
        customer.push(params.customer);
      } else {
        customer = util.getCustomer();
      }
      return customer; //params customer is not null is it executed via suitelet
    } catch (e) {
      log.error("getInputData", e.message);
    }
  };

  const map = (mapContext) => {
    try {
      let customer = JSON.parse(mapContext.value);
      log.debug("mapContext", customer);
      let params = getParameters();
      let monthId = params.month ? params.month : "thismonth";
      let month;
      const currentDate = new Date();
      let monthNumber = currentDate.getMonth();
      let year = currentDate.getFullYear();
      if (monthId == "thismonth") {
        month = util.getCurrentMonth();
      } else {
        if (monthNumber == 0) {
          monthNumber = 12;
          year = year - 1;
        }

        month = util.createMonthlist()[monthNumber - 1];
      }

      // if the customer summary invoice has been sent to already to the selected month the script will skip the customer
      if (
          util.checkIfSummaryInvoiceSentToCustomer(
              customer.value,
              month,
              year
          ) === true
      ) {
        log.audit(
            `INFRORMATION`,
            `CUSTOMER ${customer.value} SUMMARY INVOICE FOR ${month} was already sent. Please delete the customer Summary Invoice record to resend again.  `
        );
        return;
      }

      const invoiceObj = util.getInvoice(customer.value, monthId); //get the list of invoice

      if (invoiceObj.invoiceList.length > 0) {
        let summaryRecId = util.createSummaryInvoiceRec(
            invoiceObj,
            customer.value,
            month,
            year
        );
        mapContext.write({ key: customer.value, value: summaryRecId });
      }
    } catch (e) {
      log.error("mapContext", e.message);
    }
  };

  const reduce = (reduceContext) => {
    try {
      log.audit("reduceContext");
      let customer = reduceContext.key;
      let summaryInvId = reduceContext.values;
      let params = getParameters();
      let summaryPDFfileId;
      const currentDate = new Date();
      let monthNumber = currentDate.getMonth();
      let monthId = params.month ? params.month : "thismonth";
      let month;
      let year = currentDate.getFullYear();
      if (monthId == "thismonth") {
        month = util.getCurrentMonth();
      } else {
        if (monthNumber == 0) {
          monthNumber = 12;
          year = year - 1
        }
        month = util.createMonthlist()[monthNumber - 1];
      }
      const pdfObj = util.printMainSummaryInvoice(
          summaryInvId[0],
          customer,
          monthId,
          util.getFileId(params.mainTemplateListXML),
          +params.folderId
      ); //render main body summary PDF
      if (pdfObj) {
        let renderPDFObj = util.renderRecordToPdfWithTemplate(
            pdfObj,
            util.getFileId(params.invoiceListTemplateXML),
            util.getFileId(params.creditMemoListTemplateXML),
            +params.folderId
        ); //render all of the invoice and store it in the file cabinet
        log.debug("renderPDFObj", renderPDFObj);
        summaryPDFfileId = util.xmltoPDF_pdfSet(renderPDFObj, +params.folderId); //append the rendered invoice to the main summary pdf and delete all of the invoices printed in the file cabinet
      }
      util.sendEmailWithFile(customer, summaryPDFfileId, month, year,params.sender);
    } catch (e) {
      log.error("reduceContext", e.message);
    }
  };

  const summarize = (summaryContext) => {
    const functionName = "summarize";
    try {
      log.audit(functionName, {
        UsageConsumed: summaryContext.usage,
        NumberOfQueues: summaryContext.concurrency,
        NumberOfYields: summaryContext.yields,
      });
      log.audit(functionName, "************ EXECUTION COMPLETED ************");
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  function getParameters() {
    const scriptObj = runtime.getCurrentScript();
    return {
      mainTemplateListXML: scriptObj.getParameter(
          "custscript_bsp_isg_summary_main_temp"
      ),
      invoiceListTemplateXML: scriptObj.getParameter(
          "custscript_bsp_isg_summary_inv_list_temp"
      ),
      creditMemoListTemplateXML: scriptObj.getParameter(
          "custscript_bsp_isg_credit_memo_sum_temp"
      ),
      customer: scriptObj.getParameter("custscript_bsp_isg_inv_sum_customer"),
      month: scriptObj.getParameter("custscript_bsp_isg_inv_sum_month"),
      folderId: scriptObj.getParameter("custscript_bsp_sum_inv_foler"),
      sender: scriptObj.getParameter("custscript_bsp_isg_sum_inv_author"),
    };
  }

  return { getInputData, map, reduce, summarize };
});
