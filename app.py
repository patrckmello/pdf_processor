from flask import Flask, request, send_file, abort, render_template
import fitz  # PyMuPDF
import io
import zipfile
import math
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    handlers=[
        logging.FileHandler("app.log", encoding='utf-8'),
        logging.StreamHandler()  # opcional, também mostra no terminal
    ]
)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge_pdfs():
    files = request.files.getlist('files')
    if not files:
        logging.warning("Tentativa de merge sem arquivos.")
        return abort(400, 'Nenhum arquivo enviado')

    logging.info(f"Recebido pedido de merge com {len(files)} arquivo(s).")

    merged_pdf = fitz.open()

    for file_storage in files:
        filename = file_storage.filename
        try:
            pdf_bytes = file_storage.read()
            pdf_doc = fitz.open(stream=pdf_bytes, filetype='pdf')
            merged_pdf.insert_pdf(pdf_doc)
            logging.info(f"Arquivo '{filename}' adicionado com sucesso ao merge.")
        except Exception as e:
            logging.error(f"Erro ao processar o arquivo '{filename}': {e}")
            return abort(500, f"Erro ao processar o arquivo '{filename}'.")

    merged_buffer = io.BytesIO()
    merged_pdf.save(merged_buffer)
    merged_pdf.close()
    merged_buffer.seek(0)

    logging.info("Merge concluído com sucesso.")

    return send_file(
        merged_buffer,
        as_attachment=True,
        download_name='unido.pdf',
        mimetype='application/pdf'
    )

@app.route('/split', methods=['POST'])
def split_pdfs():
    files = request.files.getlist('pdfs')
    mode = request.form.get('mode')

    if not files or not mode:
        logging.warning("Tentativa de split sem arquivos válidos ou modo não especificado.")
        return abort(400, 'Arquivos ou modo ausente.')

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_storage in files:
            filename = file_storage.filename
            base_name = filename.rsplit('.', 1)[0]
            try:
                pdf_bytes = file_storage.read()
                pdf_doc = fitz.open(stream=pdf_bytes, filetype='pdf')
                total_pages = pdf_doc.page_count

                if mode == 'parts':
                    parts = request.form.get('parts', type=int)
                    if not parts or parts < 2:
                        return abort(400, 'Número de partes inválido.')

                    logging.info(f"Dividindo '{filename}' em {parts} partes.")

                    pages_per_part = math.ceil(total_pages / parts)

                    for i in range(parts):
                        start_page = i * pages_per_part
                        end_page = min(start_page + pages_per_part, total_pages)

                        if start_page >= total_pages:
                            break

                        new_pdf = fitz.open()
                        for page_num in range(start_page, end_page):
                            new_pdf.insert_pdf(pdf_doc, from_page=page_num, to_page=page_num)

                        pdf_buffer = io.BytesIO()
                        new_pdf.save(pdf_buffer)
                        new_pdf.close()
                        pdf_buffer.seek(0)

                        zipf.writestr(f"{base_name}_parte_{i+1}_de_{parts}.pdf", pdf_buffer.read())

                elif mode == 'size':
                    max_size_mb = request.form.get('max_size_mb', type=float)
                    if not max_size_mb or max_size_mb <= 0:
                        return abort(400, 'Tamanho máximo inválido.')

                    logging.info(f"Dividindo '{filename}' em partes de até {max_size_mb} MB.")

                    part_number = 1
                    new_pdf = fitz.open()

                    size_limit = max_size_mb * 0.9

                    for page_num in range(total_pages):
                        new_pdf.insert_pdf(pdf_doc, from_page=page_num, to_page=page_num)

                        temp_buffer = io.BytesIO()
                        new_pdf.save(temp_buffer)
                        size_mb = temp_buffer.tell() / (1024 * 1024)

                        if size_mb > size_limit:
                            new_pdf.delete_page(-1)

                            temp_buffer = io.BytesIO()
                            new_pdf.save(temp_buffer)
                            temp_buffer.seek(0)
                            zipf.writestr(f"{base_name}_parte_{part_number}.pdf", temp_buffer.read())
                            part_number += 1

                            new_pdf = fitz.open()
                            new_pdf.insert_pdf(pdf_doc, from_page=page_num, to_page=page_num)

                    if len(new_pdf) > 0:
                        final_buffer = io.BytesIO()
                        new_pdf.save(final_buffer)
                        final_buffer.seek(0)
                        zipf.writestr(f"{base_name}_parte_{part_number}.pdf", final_buffer.read())


            except Exception as e:
                logging.error(f"Erro ao dividir o arquivo '{filename}': {e}")
                return abort(500, f"Erro ao dividir o arquivo '{filename}'.")

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='divididos.zip'
    )


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5007)
