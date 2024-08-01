import tensorflow as tf
from PIL import Image
import io


def retrieveImages(tfrecord_path, target_image_dir=None):
    #number of tfrecords(images) in target_image_dir
    total_records = sum(1 for _ in tf.data.TFRecordDataset(tfrecord_path))
    print(f'Total records in {tfrecord_path}: {total_records}')

    images = tf.data.TFRecordDataset(tfrecord_path)
    image_counter = 0
    
    for raw_record in images.take(2):
        record_tensor = raw_record.numpy()
        example = tf.train.Example()
        example.ParseFromString(record_tensor)
        print(example)

        #image_name = example.features.feature['image/filename'].bytes_list.value[0].decode('utf-8')
        #image_bytes = example.features.feature['image/encoded'].bytes_list.value[0]
        
        #image_counter += 1
        
        #if image_name.startswith('STONE'):
            #image_name = f'Stone---{image_counter}.jpg'
        #else:
            #image_name = f'Normal---{image_counter}.jpg'

        #pillow_image = Image.open(io.BytesIO(image_bytes))
        #pillow_image.save(f'{target_image_dir}/{image_name}')

        #print(f'Image {image_counter}: {image_name}')

    #total_images = len(tf.io.gfile.listdir(target_image_dir))
    #print(f'Total images in directory: {total_images}')

    
retrieveImages(r'C:\laragon\www\kidney-stones\data\tfrecords\ks_val.tfrecord')

#print(sum(1 for _ in tf.data.TFRecordDataset(r'C:\laragon\www\kidney-stones\data\tfrecords\ks_test.tfrecord')))


#train = 500
    #normal = 43
    #stone = 457

#val = 142
    #normal = 12
    #stone = 130

#test = 74
    #normal = 7
    #stone = 67

#norm 62
#abnorm 654