import pika
import json
import time
import sys

def callback(ch, method, properties, body):
    try:
        dane = json.loads(body.decode())
        print("\n" + "="*50)
        print("[MIKROSERWIS POWIADOMIEŃ] Odebrano zdarzenie z szyny RabbitMQ!")
        print(f"-> ID Rezerwacji: {dane.get('id_rezerwacji')}")
        print(f"-> Klient: {dane.get('klient')}")
        print(f"-> Stolik nr: {dane.get('stolik_nr')}")
        print(f"-> Data i godzina: {dane.get('data_godzina')}")
        print("-"*50)
        print(f"✉️ [SUKCES] Wysłano automatyczne potwierdzenie e-mail na adres klienta!")
        print("="*50 + "\n")
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"[BŁĄD PRZETWARZANIA]: {e}")

def main():
    print("[Notification Service] Uruchamianie... Oczekiwanie na gotowość RabbitMQ.")
    
    while True:
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
            break
        except pika.exceptions.AMQPConnectionError:
            time.sleep(2)

    channel = connection.channel()
    channel.queue_declare(queue='powiadomienia_rezerwacji', durable=True)
    
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(queue='powiadomienia_rezerwacji', on_message_callback=callback)

    print("[Notification Service] Połączono z RabbitMQ. Nasłuchiwanie kolejki 'powiadomienia_rezerwacji'...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
        connection.close()

if __name__ == '__main__':
    sys.stdout.reconfigure(line_buffering=True)
    main()
