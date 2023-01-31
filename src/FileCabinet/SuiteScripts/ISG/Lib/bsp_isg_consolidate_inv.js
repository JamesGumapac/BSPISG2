/**
 * @NApiVersion 2.1
 */
define(["N/search", "N/record", "N/render", "N/file", "N/xml", "N/email"], (
    search,
    record,
    render,
    file,
    mxml,
    email
) => {
    function isEmpty(stValue) {
        return (
            stValue === "" ||
            stValue == null ||
            false ||
            (stValue.constructor === Array && stValue.length == 0) ||
            (stValue.constructor === Object &&
                (function (v) {
                    for (var k in v) return false;
                    return true;
                })(stValue))
        );
    }

    /**
     * Mimic Netsuite Quick Filter Settings
     * @returns {[{text: string, value: string},{text: string, value: string},{text: string, value: string},{text: string, value: string},{text: string, value: string},null,null]}
     */
    function createQuickFilter() {
        return [
            {
                value: "lastmonth",
                text: "last month",
            },
            {
                value: "thismonth",
                text: "this month",
            },
        ];
    }

    /**
     * get customer with Summary Invoice = true
     */
    function getCustomer() {
        let customerIds = [];

        const customerSearchObj = search.create({
            type: "customer",
            filters: [["custentity_bsp_isg_summary_invoice", "is", "T"]],
            columns: [
                search.createColumn({
                    name: "entityid",
                    sort: search.Sort.ASC,
                    label: "Name",
                }),
                search.createColumn({ name: "companyname", label: "Company Name" }),
            ],
        });
        customerSearchObj.run().each(function (result) {
            let companyName = result.getValue({
                name: "companyname",
            });
            customerIds.push({
                value: result.id,
                text: companyName,
            });
            return true;
        });

        return customerIds;
    }

    /**
     * Render all invoice
     * @param PDFrenderObj
     * @param templateId
     * @param creditMemoTemplate
     * @param folderId
     * @returns {{pdfUrls: *[], summaryInvoiceName: *, fileIdsToDelete: *[], summaryInvoiceId: *}}
     */
    function renderRecordToPdfWithTemplate(
        PDFrenderObj,
        templateId,
        creditMemoTemplate,
        folderId
    ) {
        try {
            log.debug("renderRecordToPdfWithTemplate", {
                PDFrenderObj,
                templateId,
                creditMemoTemplate,
                folderId,
            });
            let summaryInvoiceName = PDFrenderObj.summaryInvoiceName;
            let summaryInvoiceId = PDFrenderObj.summaryInvoiceId;
            let pdfUrls = [];
            pdfUrls.push(PDFrenderObj.urlFile);
            let fileIdsToDelete = [];
            fileIdsToDelete.push(PDFrenderObj.fileId);
            const xmlTemplateFile = file.load({ id: +templateId });
            const cmxmlTemplateFile = file.load({ id: +creditMemoTemplate });
            const renderer = render.create();

            let invoiceList = PDFrenderObj.invoiceList;
            log.debug("renderRecordToPdfWithTemplate invoiceList", invoiceList);
            invoiceList.forEach(function (id) {
                renderer.templateContent = xmlTemplateFile.getContents();
                let updatedInvoiceId = updateSummaryInvoiceId(
                    id,
                    PDFrenderObj.summaryInvoiceName
                );
                if (updatedInvoiceId) {
                    renderer.addRecord(
                        "record",
                        record.load({
                            type: record.Type.INVOICE,
                            id: updatedInvoiceId,
                        })
                    );
                    let cmIds = getInvoiceCreditMemo(updatedInvoiceId);

                    let invoicePdf = renderer.renderAsPdf();
                    invoicePdf.isOnline = true;
                    invoicePdf.name = updatedInvoiceId + "_" + summaryInvoiceName;
                    invoicePdf.folder = folderId;
                    let fileId = invoicePdf.save();

                    if (fileId) {
                        fileIdsToDelete.push(fileId);
                        let savedFile = file.load({ id: fileId });
                        let url = savedFile.url;
                        let separator = url.lastIndexOf("com");
                        pdfUrls.push(url.substring(separator));
                    }
                    if (cmIds.length > 0) {
                        log.debug("Credit memo rendering")
                        cmIds.forEach((id) =>{
                            renderer.templateContent = cmxmlTemplateFile.getContents();
                            renderer.addRecord(
                                "record",
                                record.load({
                                    type: record.Type.CREDIT_MEMO,
                                    id: +id,
                                })
                            );
                            let cmPDF = renderer.renderAsPdf();
                            cmPDF.isOnline = true;
                            cmPDF.name = id + "_" + summaryInvoiceName;
                            cmPDF.folder = folderId;
                            let fileId = cmPDF.save();
                            if (fileId) {
                                fileIdsToDelete.push(fileId);
                                let savedFile = file.load({ id: fileId });
                                let url = savedFile.url;
                                let separator = url.lastIndexOf("com");
                                pdfUrls.push(url.substring(separator));
                            }
                        })

                    }
                }
            });

            return {
                pdfUrls,
                summaryInvoiceName,
                fileIdsToDelete,
                summaryInvoiceId,
            };
        } catch (e) {
            log.error("renderRecordToPdfWithTemplate", e.message);
        }
    }

    /**
     * Update invoice record summary invoice so it will be included in the printout
     * @param invoiceId
     * @param summaryInvoiceId
     * @returns {number}
     */
    function updateSummaryInvoiceId(invoiceId, summaryInvoiceId) {
        return record.submitFields({
            type: record.Type.INVOICE,
            id: invoiceId,
            values: {
                custbody_bsp_isg_sum_inv_id: summaryInvoiceId,
            },
        });
    }

    /**
     * Append the invoices PDF to the main PDF
     * @param renderObj
     * @param folderId
     * @returns {*}
     */
    function xmltoPDF_pdfSet(renderObj, folderId) {
        try {
            let xml =
                '<?xml version="1.0"?>\n<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n';
            xml += "<pdfset>";

            renderObj.pdfUrls.forEach(function (url) {
                url = mxml.escape(url);
                xml += "<pdf src='" + url + "'/>";
            });

            xml += "</pdfset>";

            let pdfFile = render.xmlToPdf({
                xmlString: xml,
            });
            pdfFile.name = renderObj.summaryInvoiceName;
            pdfFile.folder = folderId;
            let pdfFileid = pdfFile.save();
            log.debug("pdfFileid", pdfFileid);
            if (pdfFileid) {
                record.submitFields({
                    type: "customrecord_bsp_isg_summary_invoice",
                    id: renderObj.summaryInvoiceId,
                    values: {
                        custrecord_bsp_isg_sum_inv_file: pdfFileid,
                    },
                });
                renderObj.fileIdsToDelete.forEach((fileId) => file.delete(fileId));
            }
            return pdfFileid;
        } catch (e) {
            log.error("xmltoPDF_pdfSet", e.message);
        }
    }

    /**
     * Create Summary Invoice Record.
     * @param invcoiceObj
     * @param customer
     * @param month
     * @param year
     */
    function createSummaryInvoiceRec(invcoiceObj, customer, month, year) {
        try {
            log.debug("createSummaryInvoiceRec", { invcoiceObj, customer, month });
            const summaryRec = record.create({
                type: "customrecord_bsp_isg_summary_invoice",
            });
            let sortInvoiceList = invcoiceObj.invoiceList.sort((a, b) =>
                a.department.toLowerCase().localeCompare(b.department.toLowerCase())
            );
            let invoiceIds = [];
            log.debug("sortInvoiceList", sortInvoiceList);
            sortInvoiceList.forEach(function (e) {
                // invoiceIds = summaryRec.getValue({
                //   fieldId: "custrecord_bsp_isg_invoice_list",
                // });
                invoiceIds.push(e.invoiceId);
                // summaryRec.setValue({
                //   fieldId: "custrecord_bsp_isg_invoice_list",
                //   value: invoiceIds,
                // });
            });
            log.debug("invoiceIds", invoiceIds)
            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_invoice_list",
                value: invoiceIds,
            });
            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_sum_inv_sort_list",
                value: JSON.stringify(invoiceIds),
            });
            summaryRec.setValue({
                fieldId: "name",
                value: "temp",
            });

            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_invoice_total",
                value: invcoiceObj.total.amountTotal
                    ? invcoiceObj.total.amountTotal
                    : 0.0,
            });
            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_invoice_tax_total",
                value: invcoiceObj.total.taxAmountTotal
                    ? invcoiceObj.total.taxAmountTotal
                    : 0.0,
            });
            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_invoice_remaining_bal",
                value: invcoiceObj.total.amountRemainingTotal
                    ? invcoiceObj.total.amountRemainingTotal
                    : 0.0,
            });

            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_sum_inv_cust",
                value: customer,
            });

            summaryRec.setValue({
                fieldId: "custrecord_bsp_isg_month",
                value: month + " " + year,
            });

            const summaryRecId = summaryRec.save();
            log.debug("summaryRecId", summaryRecId);

            if (summaryRecId) {
                record.submitFields({
                    type: "customrecord_bsp_isg_summary_invoice",
                    id: summaryRecId,
                    values: {
                        name: createId(summaryRecId),
                    },
                });
            }

            return summaryRecId;
        } catch (e) {
            log.error("createSummaryInvoiceRec", e.message);
        }
    }

    /**
     * Get the curent month invoice Id
     * @returns {*}
     */
    function getCurrentMonth() {
        let month = createMonthlist();
        const d = new Date();
        return month[d.getMonth()];
    }

    /**
     * Print the summary invoice main PDF
     * @param summaryInvoiceId
     * @param customerId
     * @param month
     * @param templateId
     * @param folderId
     * @returns {{invoiceList: *, summaryInvoiceName: *, summaryInvoiceId, fileId: *, urlFile: string}}
     */
    function printMainSummaryInvoice(
        summaryInvoiceId,
        customerId,
        month,
        templateId,
        folderId
    ) {
        log.debug("printMainSummaryInvoice Params", {
            summaryInvoiceId,
            customerId,
            month,
            templateId,
            folderId,
        });
        try {
            const summaryInvRec = getSummaryRecObject(summaryInvoiceId);
            const transactionSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["amountremainingisabovezero", "is", "T"],
                    "AND",
                    ["trandate", "within", month],
                    "AND",
                    [
                        ["name", "anyof", customerId],
                        "OR",
                        ["customer.parent", "anyof", customerId],
                    ],
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_bsp_isg_department",
                        join: "shippingAddress",
                        summary: "GROUP",
                        sort: search.Sort.ASC,
                        label: "Department",
                    }),
                    search.createColumn({
                        name: "amountremaining",
                        summary: "SUM",
                        label: "Amount Remaining",
                    }),
                    search.createColumn({
                        name: "amount",
                        summary: "SUM",
                        label: "Amount",
                    }),
                    search.createColumn({
                        name: "taxamount",
                        summary: "SUM",
                        label: "Amount (Tax)",
                    }),
                    search.createColumn({
                        name: "formulacurrency",
                        summary: "SUM",
                        formula:
                            "nvl({netamount},0)-nvl({shippingcost},0)-NVL({taxtotal},0) - nvl({discountamount},0)",
                        label: "Formula (Currency)",
                    }),
                    search.createColumn({
                        name: "shippingcost",
                        summary: "SUM",
                        label: "Shipping Cost",
                    }),
                ],
            });
            let summaryDetails = [];
            let mainfields = [];
            let department,
                remainingAmount = 0.0,
                taxAmount = 0.0,
                amount = 0.0,
                invoiceTotal = 0.0,
                grossAmount = 0.0,
                shippingCost = 0.0,
                totalPurchase = 0.0,
                delSvcAmount = 0.0,
                taxTotal = 0.0;
            transactionSearchObj.run().each(function (result) {
                department = result.getValue({
                    name: "custrecord_bsp_isg_department",
                    join: "shippingAddress",
                    summary: "GROUP",
                });
                remainingAmount = result.getValue({
                    name: "amountremaining",
                    summary: "SUM",
                });
                invoiceTotal += remainingAmount ? parseFloat(remainingAmount) : 0;
                taxAmount = result.getValue({
                    name: "taxamount",
                    summary: "SUM",
                });
                taxTotal += taxAmount ? parseFloat(taxAmount) : 0;
                amount = result.getValue({
                    name: "amount",
                    summary: "SUM",
                });

                grossAmount = result.getValue({
                    name: "formulacurrency",
                    summary: "SUM",
                    formula:
                        "nvl({netamount},0)-nvl({shippingcost},0)-NVL({taxtotal},0) - nvl({discountamount},0)",
                });
                totalPurchase += grossAmount ? parseFloat(grossAmount) : 0;

                shippingCost = result.getValue({
                    name: "shippingcost",
                    summary: "SUM",
                });
                delSvcAmount += shippingCost ? +shippingCost : 0;
                summaryDetails.push({
                    department: department,
                    amountRemaining: remainingAmount
                        ? parseFloat(remainingAmount)
                            .toFixed(2)
                            .replace(/\d(?=(\d{3})+\.)/g, "$&,")
                        : 0,
                    tax: taxAmount
                        ? parseFloat(taxAmount)
                            .toFixed(2)
                            .replace(/\d(?=(\d{3})+\.)/g, "$&,")
                        : 0,
                    total: amount
                        ? parseFloat(amount)
                            .toFixed(2)
                            .replace(/\d(?=(\d{3})+\.)/g, "$&,")
                        : 0,
                    grossAmount: grossAmount
                        ? parseFloat(grossAmount)
                            .toFixed(2)
                            .replace(/\d(?=(\d{3})+\.)/g, "$&,")
                        : 0,
                    shippingCost: shippingCost
                        ? parseFloat(shippingCost)
                            .toFixed(2)
                            .replace(/\d(?=(\d{3})+\.)/g, "$&,")
                        : 0,
                });
                return true;
            });
            //  log.audit("amounts", { invoiceTotal, taxTotal, delSvcAmount });
            let TOTALPURCHASE = invoiceTotal - (taxTotal + delSvcAmount);
            //   log.audit("TOTALPURCHASE", TOTALPURCHASE);
            mainfields.push({
                invoiceTotal: invoiceTotal
                    ? invoiceTotal.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
                    : 0,
                totalPurchase: TOTALPURCHASE
                    ? TOTALPURCHASE.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
                    : 0,
                delSvcAmount: delSvcAmount
                    ? delSvcAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
                    : 0,
                taxTotal: taxTotal
                    ? taxTotal.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
                    : 0,
                customerName: summaryInvRec.getText("custrecord_bsp_isg_sum_inv_cust"),
                customerId: summaryInvRec.getValue(
                    "custrecord_bsp_isg_sum_inv_entity_id"
                ),
                invoiceNumber: summaryInvRec.getValue("name"),
                billTo: summaryInvRec
                    .getValue("custrecord_bsp_isg_bill_to")
                    .replaceAll("\n", "<br />"),
                invoiceDate: getDateNow(),
                terms: summaryInvRec.getText("custrecord_bsp_isg_terms"),
            });
            //   log.debug("mainfields", mainfields);
            let summary = {
                summary: summaryDetails,
                mainfields: mainfields,
            };
            // log.debug("summary", summary);
            var objRender = render.create();
            var xmlTmpFile = file.load(templateId);
            objRender.templateContent = xmlTmpFile.getContents();

            objRender.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "data",
                data: summary,
            });

            const summaryInvoicePdf = objRender.renderAsPdf();
            summaryInvoicePdf.isOnline = true;
            summaryInvoicePdf.name =
                summaryInvRec.getValue("name") +
                "_" +
                summaryInvRec.getText("custrecord_bsp_isg_sum_inv_cust");
            summaryInvoicePdf.folder = folderId;
            let fileId = summaryInvoicePdf.save();
            let urlFile;
            if (fileId) {
                let summaryInvoiceFile = file.load(fileId);
                urlFile = summaryInvoiceFile.url;
            }
            let invoiceList = summaryInvRec.getValue(
                "custrecord_bsp_isg_sum_inv_sort_list"
            );
            log.debug("printMainSummaryInvoice invoiceList", invoiceList);
            return {
                summaryInvoiceId: summaryInvoiceId,
                summaryInvoiceName: summaryInvRec.getValue("name"),
                fileId: fileId,
                invoiceList: JSON.parse(invoiceList),
                urlFile: urlFile,
            };
        } catch (e) {
            log.error("printMainSummaryInvoice", e.message);
        }
    }

    /**
     * Create Hard Coded Month String Name
     * @returns {string[]}
     */
    function createMonthlist() {
        return [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
    }

    /**
     * Create Summary invoice Id
     * @param internalId
     * @returns {string}
     */
    function createId(internalId) {
        const id = "SUM-000000";
        return (
            id.slice(0, id.length - internalId.toString().length) +
            internalId.toString()
        );
    }

    /**
     * group results by department
     * @param array
     * @param key
     * @returns {*}
     */
    function groupByKey(array, key) {
        return array.reduce((hash, obj) => {
            if (obj[key] === undefined) return hash;
            return Object.assign(hash, {
                [obj[key]]: (hash[obj[key]] || []).concat(obj),
            });
        }, {});
    }

    /**
     * Load summary invoice record
     * @param id
     * @returns {Record}
     */
    function getSummaryRecObject(id) {
        return record.load({
            type: "customrecord_bsp_isg_summary_invoice",
            id: id,
        });
    }

    /**
     * get the last day of the month
     * @param month
     * @returns {number}
     */
    function getEndDay(month) {
        let numofdays;
        switch (parseInt(month)) {
            case 1:
                numofdays = 31;
                break;
            case 2:
                numofdays = 28;
                break;
            case 3:
                numofdays = 31;
                break;
            case 4:
                numofdays = 30;
                break;
            case 5:
                numofdays = 31;
                break;
            case 6:
                numofdays = 30;
                break;
            case 7:
                numofdays = 31;
                break;
            case 8:
                numofdays = 31;
                break;
            case 9:
                numofdays = 30;
                break;
            case 10:
                numofdays = 31;
                break;
            case 11:
                numofdays = 30;
                break;
            case 12:
                numofdays = 31;
                // code block
                break;
            default:
            // code block
        }
        return numofdays;
    }

    /**
     * This function gets all of the invoice based on customer and date filters
     * @param customer
     * @param month
     * @returns An array of objects.
     */
    function getInvoice(customer, month) {
        try {
            log.debug("Get Invoice", { customer, month });
            let invoiceList = [];

            const transactionSearchObj = search.create({
                type: "invoice",
                filters: [
                    [
                        ["name", "anyof", customer],
                        "OR",
                        ["customer.parent", "anyof", customer],
                    ],
                    "AND",
                    ["amountremainingisabovezero", "is", "T"],
                    "AND",
                    ["trandate", "within", month],
                ],
                columns: [
                    search.createColumn({
                        name: "internalid",
                        summary: "GROUP",
                        label: "Internal ID",
                    }),
                    search.createColumn({
                        name: "custrecord_bsp_isg_department",
                        join: "shippingAddress",
                        summary: "GROUP",
                        sort: search.Sort.ASC,
                        label: "Department",
                    }),
                    search.createColumn({
                        name: "amountremaining",
                        summary: "SUM",
                        label: "Amount Remaining",
                    }),
                    search.createColumn({
                        name: "amount",
                        summary: "SUM",
                        label: "Amount",
                    }),
                    search.createColumn({
                        name: "taxamount",
                        summary: "SUM",
                        label: "Amount (Tax)",
                    }),
                    search.createColumn({
                        name: "tranid",
                        summary: "GROUP",
                        label: "Tranid",
                    }),
                    search.createColumn({
                        name: "shippingattention",
                        summary: "GROUP",
                        label: "Shipping Attention",
                    }),
                ],
            });

            let amountRemainingTotal = 0.0;
            let amountTotal = 0.0;
            let taxAmountTotal = 0.0;
            let columns = transactionSearchObj.columns;
            transactionSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                let invoiceId = result.getValue(columns[0]);
                let department = result.getValue(columns[1]);
                let amountRemaining = result.getValue(columns[2]);
                let amount = result.getValue(columns[3]);
                let taxAmount = result.getValue(columns[4]);
                let tranId = result.getValue(columns[5]);
                let attentionName = result.getValue(columns[6]);
                amountRemainingTotal += parseFloat(amountRemaining)
                    ? parseFloat(amountRemaining)
                    : 0.0;
                amountTotal += parseFloat(amount) ? parseFloat(amount) : 0.0;
                taxAmountTotal += parseFloat(taxAmount) ? parseFloat(taxAmount) : 0.0;
                invoiceList.push({
                    invoiceId: invoiceId,
                    department: department,
                    amountRemaining: amountRemaining,
                    amount: amount,
                    taxAmount: taxAmount,
                    tranId: tranId,
                    attentionName: attentionName,
                });
                return true;
            });
            let total = {
                amountRemainingTotal: amountRemainingTotal.toFixed(2),
                amountTotal: amountTotal.toFixed(2),
                taxAmountTotal: taxAmountTotal.toFixed(2),
            };

            return {
                invoiceList: invoiceList,
                total: total,
            };
        } catch (e) {
            log.error("getInvoice", e.message);
        }
    }

    /**
     * Return file Id based on filename
     * @param fileName
     * @returns {number}
     */
    function getFileId(fileName) {
        const fileSearch = search
            .create({
                type: "file",
                filters: [["name", "is", fileName]],
            })
            .run()
            .getRange({ start: 0, end: 1 });
        return fileSearch[0].id;
    }

    /**
     * Get all credit memo created from a certain invoice
     * @param invoiceId
     * @returns {*[]}
     */
    function getInvoiceCreditMemo(invoiceId) {
        try {
            let cmIds = [];
            var transactionSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["createdfrom", "anyof", invoiceId],
                    "AND",
                    ["mainline", "is", "T"],
                ],
            });
            transactionSearchObj.run().each(function (result) {
                cmIds.push(result.id);
                return true;
            });
            return cmIds;
        } catch (e) {
            log.debug("invoiceCreditMemo", e.message);
        }
    }

    /**
     * From Date to MM/DD/YYYY
     * @param str
     * @returns {string}
     */
    function formatDateTimeSearch(str) {
        let date = new Date(str),
            mnth = ("0" + (date.getMonth() + 1)).slice(-2),
            day = ("0" + date.getDate()).slice(-2);
        return [mnth, day, date.getFullYear()].join("/");
    }

    /**
     * Send email to the customer
     * @param customerId
     * @param fileId
     * @param month
     * @param year
     * @param sender
     */
    function sendEmailWithFile(customerId, fileId, month, year,sender) {
        try {
            log.debug("sendEmailWithFile", { customerId, fileId, month,year, sender });
            const fileID = file.load({ id: fileId });

            month = month + " " + year;
            //static Author
            let customer = customerId;
            email.send({
                author: sender,
                recipients: customer,
                subject: month + " Invoice Summary",
                body: "See invoices attached below",
                attachments: [fileID],
            });
            log.audit("Email SENT", "Email sent to: " + customer);
        } catch (e) {
            log.error("sendEmailWithFile", e.message);
        }
    }

    /**
     * Check if the summary invoice was already sent to the customer in the month selected
     * @param customerId
     * @param month
     * @param year
     * @returns {boolean}
     */
    function checkIfSummaryInvoiceSentToCustomer(customerId, month, year) {

        month = month + " " + year;
        const customrecord_bsp_isg_summary_invoiceSearchObj = search.create({
            type: "customrecord_bsp_isg_summary_invoice",
            filters: [
                ["custrecord_bsp_isg_sum_inv_cust", "anyof", customerId],
                "AND",
                ["custrecord_bsp_isg_month", "is", month],
            ],
        });
        let searchResultCount =
            customrecord_bsp_isg_summary_invoiceSearchObj.runPaged().count;
        return searchResultCount > 0;
    }

    /**
     * Get date now MM/DD/YYYY
     * @returns {string}
     */
    function getDateNow() {
        let dateHolder = new Date();
        return [
            dateHolder.getMonth() + 1,
            dateHolder.getDate(),
            dateHolder.getFullYear(),
        ].join("/");
    }

    return {
        getFileId: getFileId,
        isEmpty: isEmpty,
        getInvoice: getInvoice,
        createSummaryInvoiceRec: createSummaryInvoiceRec,
        sendEmailWithFile: sendEmailWithFile,
        renderRecordToPdfWithTemplate: renderRecordToPdfWithTemplate,
        xmltoPDF_pdfSet: xmltoPDF_pdfSet,
        groupByKey: groupByKey,
        getCustomer: getCustomer,
        printMainSummaryInvoice: printMainSummaryInvoice,
        getDateNow: getDateNow,
        createMonthlist: createMonthlist,
        getCurrentMonth: getCurrentMonth,
        checkIfSummaryInvoiceSentToCustomer: checkIfSummaryInvoiceSentToCustomer,
        createQuickFilter: createQuickFilter,
    };
});
