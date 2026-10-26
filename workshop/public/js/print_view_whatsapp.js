(function() {
    console.log("=== WhatsApp Share Script Initialized ===");

    function forceWhatsAppButton() {
        const targetToolbar = document.querySelector('.page-container[data-page-route="print"] .page-actions');

        if (targetToolbar) {
            if (document.querySelector('.btn-whatsapp-share')) {
                return;
            }

            console.log("=== Target element hit: Injecting WhatsApp button now ===");

            const btnHtml = `
                <button class="btn btn-success btn-sm custom-btn btn-whatsapp-share" style="margin-left: 5px;">
                    <i class="fa fa-whatsapp" style="margin-right: 5px;"></i> ${__("Share via WhatsApp")}
                </button>
            `;

            $(targetToolbar).append(btnHtml);

            $('.btn-whatsapp-share').on('click', async function() {
                // Safely scrape route array data
                const routeParts = frappe.get_route(); // e.g. ["print", "Sales Invoice", "SINV-0001"]

                // Extract precise string elements from the array indices
                const doctype = routeParts[1];
                const docname = routeParts[2];
                const print_format = "Standard";

                if (!doctype || !docname) {
                    frappe.msgprint(__("Could not read Document details. Please toggle Print Format or reload page."));
                    return;
                }

                const pdf_url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(docname)}&format=${encodeURIComponent(print_format)}`;

                try {
                    frappe.show_alert({message: __('Compiling PDF file...'), color: 'blue'});

                    const response = await fetch(pdf_url);
                    if (!response.ok) throw new Error("Server failed to compile PDF.");

                    const blob = await response.blob();
                    const file = new File([blob], `${docname}.pdf`, { type: 'application/pdf' });

                    // Launch the native system share sheet (best for Android/iOS tablets)
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: `${doctype} ${docname}`,
                            text: `Attached: ${doctype} - ${docname}`
                        });
                    } else {
                        // Fallback browser download window if native frame blocks sharing
                        window.open(pdf_url, '_blank');
                        frappe.msgprint(__("Device security block. The PDF has been saved to your downloads; please pick it up inside WhatsApp manually."));
                    }
                } catch (err) {
                    frappe.msgprint(__("Error generating file asset: ") + err.message);
                }
            });
        }
    }

    $(document).on('page-change', function() {
        setTimeout(forceWhatsAppButton, 300);
    });

    const viewObserver = new MutationObserver(() => forceWhatsAppButton());
    viewObserver.observe(document.body, { childList: true, subtree: true });
})();
