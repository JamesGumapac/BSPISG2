/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  "N/https",
  "N/http",
  "N/runtime",
  "N/record",
  "N/redirect",
  "N/ui/serverWidget",
  "N/search",
  "N/task",
  "N/cache",
  "N/email",
  "N/file",
  "./Lib/bsp_isg_consolidate_inv.js",
], /**
 * @param{https} https
 * @param{runtime} runtime
 * @param{record} record
 * @param{redirect} redirect
 * @param{serverWidget} serverWidget
 * @param{search} search
 * @param{task} task
 * @param cache
 
 */ (
  https,
  http,
  runtime,
  record,
  redirect,
  serverWidget,
  search,
  task,
  cache,
  email,
  file,
  util
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    let functionName = "onRequest";
    try {
      let objSuiteletScriptParams = getParameters();
      let objClientParams = scriptContext.request.parameters;
      if (scriptContext.request.method === http.Method.GET) {
        let params = {
          clientScript_id: objSuiteletScriptParams.script_client,
          customerSelected: objClientParams.custparam_customerSelected,
          month: objClientParams.custparam_month,
          email: objClientParams.custparam_email,
        };
        let form = displayForm(params);
        scriptContext.response.writePage(form);
      } else if (scriptContext.request.method === http.Method.POST) {
        try {
          let objSuiteletScriptParams = getParameters();
          
          log.debug("params", objSuiteletScriptParams);
          const req = scriptContext.request;
          const customer = req.parameters.custpage_customer;

          let month = req.parameters.custpage_month;
          month = parseInt(month) + 1;
          const myTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: objSuiteletScriptParams.scriptId,
            deploymentId: objSuiteletScriptParams.deploymentId,
            params: {
              custscript_bsp_isg_inv_sum_customer: {
                value: customer,
                text: objSuiteletScriptParams.text,
              },
              custscript_bsp_isg_inv_sum_month: +month,
            },
          });
          let objTaskId = myTask.submit();
          log.debug("objTaskId", objTaskId);
          redirect.toRecord({
            id: customer,
            type: record.Type.CUSTOMER,
          });
       
        } catch (error) {
          if (error.name === "SCHEDULED_SCRIPT_ALREADY_RUNNING") {
          }
        }
      }
    } catch (error) {
      log.error(functionName, { error: error.toString() });
    }
  };

  /**
   * It creates a form, adds a client script to it, creates header fields, and then creates a sublist of
   * items
   * @param params -
   * @returns The form object is being returned.
   */
  const displayForm = (params) => {
    try {
      let form = serverWidget.createForm({
        title: "Summary Invoice",
      });
      form.clientScriptFileId = util.getFileId(
        "bsp_isg_cs_invoice_consolidation.js"
      );
      form = createHeaderFields(form, params);
      if (!util.isEmpty(params.customerSelected)) {
        log.debug("displayform params", params);
        let invoice = util.getInvoice(
          params.customerSelected,
          +params.month + 1
        );
        log.debug("invoice", invoice.total);
        form = createItemSublist(form, invoice.invoiceList, params,);
      }
      return form;
    } catch (e) {
      log.error("displayForm", e.message);
    }
  };

  /**
   * It creates the header fields for the form
   * @param form - The form object that we are going to add fields to.
   * @param params - This is an object that contains the following properties:
   * @returns The form object is being returned.
   */
  const createHeaderFields = (form, params) => {
    try {
      /**
       * Field Group Customer
       */
      form.addFieldGroup({
        id: "fieldgroup_customer_info",
        label: "Filter",
      });

    
      const customer = form.addField({
        id: "custpage_customer",
        type: serverWidget.FieldType.SELECT,
        label: "Customer",
        container: "fieldgroup_customer_info",
      });
      if (params.customerSelected) {
        customer.defaultValue = params.customerSelected;
      }
      customer.addSelectOption({
        value: "",
        text: "",
      });
      util.getCustomer().forEach(function (result) {
        customer.addSelectOption({
          value: result.value,
          text: result.text,
        });
      });
      customer.isMandatory = true;
      const email = form
        .addField({
          id: "custpage_email",
          type: serverWidget.FieldType.TEXT,
          label: "Email address",
          container: "fieldgroup_customer_info",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      email.defaultValue = params.email;
      let months = form.addField({
        id: "custpage_month",
        type: serverWidget.FieldType.SELECT,
        label: "Month",
        container: "fieldgroup_customer_info",
      });
      let monthList = util.createMonthlist();
      log.debug("Monthlist", monthList.length)
      months.addSelectOption({
        value: "",
        text: "",
      });
      
      for (let i = 0; i < monthList.length ; i++) {
        months.addSelectOption({
          value: i,
          text: monthList[i],
        });
      }
      if (params.month) {
        months.defaultValue = params.month;
      }
      months.isMandatory = true;
     
      let itemsInQueueField = form.addField({
        id: "custpage_item_queue",
        type: serverWidget.FieldType.LONGTEXT,
        label: "Items in queue",
      });
      itemsInQueueField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

      /**
       * Field Group Invoice Information
       */
      form.addFieldGroup({
        id: "fieldgroup_po_info",
        label: "Summary Invoice",
      });

      form
        .addField({
          id: "custpage_tax_total_amount",
          type: serverWidget.FieldType.TEXT,
          label: "Tax Total",
          container: "fieldgroup_po_info",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = `$${0.0}`;

      form
        .addField({
          id: "custpage_invoice_total_amount",
          type: serverWidget.FieldType.TEXT,
          label: "Total Amount",
          container: "fieldgroup_po_info",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = `$${0.0}`;

      form
        .addField({
          id: "custpage_total_amount_remaining",
          type: serverWidget.FieldType.TEXT,
          label: "Total Amount Remaining",
          container: "fieldgroup_po_info",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = `$${0.0}`;

      form.addFieldGroup({
        id: "fieldgroup_items_info",
        label: "Invoice list",
      });

      form
        .addField({
          id: "custpage_select_all",
          type: serverWidget.FieldType.CHECKBOX,
          label: "Select/Unselect all",
          container: "fieldgroup_items_info",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        });
      form.addSubmitButton({
        id: "custpage_generate_summary_invoice",
        label: "Email Summary Invoice",
      });
      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };

  /**
   * It creates a sublist on the form and populates it with the items that are passed in
   * @param form - The form object that we are adding the sublist to.
   * @param items - An array of objects that contain the item information.
   * @returns The form is being returned.
   */
  const createItemSublist = (form, items) => {
    let sublist = form.addSublist({
      id: "custpage_items_sublist",
      type: serverWidget.SublistType.LIST,
      label: "Invoice List",
    });

    sublist
      .addField({
        id: "custpage_item_selected",
        type: serverWidget.FieldType.CHECKBOX,
        label: "Select",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });
    sublist
      .addField({
        id: "custpage_department",
        type: serverWidget.FieldType.TEXT,
        label: "Department",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });
    sublist
      .addField({
        id: "custpage_invoice_id",
        type: serverWidget.FieldType.TEXT,
        label: "Internal Id",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    sublist
      .addField({
        id: "custpage_tranid",
        type: serverWidget.FieldType.TEXT,
        label: "Invoice Id",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });
    sublist
      .addField({
        id: "custpage_amount",
        type: serverWidget.FieldType.CURRENCY,
        label: "Amount",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });
    sublist
      .addField({
        id: "custpage_amount_remaining",
        type: serverWidget.FieldType.CURRENCY,
        label: "Amount Remaining",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

    sublist
      .addField({
        id: "custpage_tax_amount",
        type: serverWidget.FieldType.CURRENCY,
        label: "Tax Amount",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });
    sublist
      .addField({
        id: "custpage_attention",
        type: serverWidget.FieldType.TEXT,
        label: "Attention Name",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      });

    pupulateItemSublist(sublist, items);

    return form;
  };

  /**
   * It takes a sublist and an array of items, and populates the sublist with the items
   * @param sublist - The sublist object
   * @param items - This is the array of items that you want to populate the sublist with.
   */
  const pupulateItemSublist = (sublist, items) => {
    if (items.length > 0) {
      let suiteletCache = cache.getCache({
        name: "itemsCache",
        scope: cache.Scope.PRIVATE,
      });

      let lineCount = 0;
      items.forEach((element) => {
        let invoiceId = element.invoiceId;
        let tranId = element.tranId;
        let amount = element.amount;
        let amountRemaining = element.amountRemaining;
        let department = element.department;
        let taxAmount = element.taxAmount;
        let attentionName = element.attentionName;

        sublist.setSublistValue({
          id: "custpage_item_selected",
          line: lineCount,
          value: "F",
        });
        sublist.setSublistValue({
          id: "custpage_invoice_id",
          line: lineCount,
          value: invoiceId,
        });
        sublist.setSublistValue({
          id: "custpage_tranid",
          line: lineCount,
          value: tranId,
        });
        sublist.setSublistValue({
          id: "custpage_amount",
          line: lineCount,
          value: amount,
        });
        sublist.setSublistValue({
          id: "custpage_amount_remaining",
          line: lineCount,
          value: amountRemaining,
        });
        sublist.setSublistValue({
          id: "custpage_department",
          line: lineCount,
          value: department ? department : "",
        });
        sublist.setSublistValue({
          id: "custpage_tax_amount",
          line: lineCount,
          value: taxAmount ? taxAmount : 0.0,
        });
        sublist.setSublistValue({
          id: "custpage_attention",
          line: lineCount,
          value: attentionName ? attentionName : "",
        });

        suiteletCache.put({
          key: invoiceId,
          value: JSON.stringify(invoiceId),
        });

        lineCount++;
      });
    }
  };

  /**
   * It returns an object with the script parameters
   * @returns An object with two properties: script_client and suitelet_title
   */
  const getParameters = () => {
    let script = runtime.getCurrentScript();
    return {
      mainTemplateListXML: script.getParameter(
        "custscript_bsp_isg_summary_inv_main_body"
      ),
      invoiceListTemplateXML: script.getParameter(
        "custscript_bsp_isg_summary_inv_list_tmp"
      ),
      deploymentId: script.getParameter("custscript_bsp_isg_sum_inv_deploy_id"),
      scriptId: script.getParameter("custscript_bsp_isg_sum_inv_mr_id"),
      customerText: script.getParameter("custparam_customerSelectedText"),
    };
  };

  return { onRequest };
});
