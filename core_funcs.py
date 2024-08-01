import numpy as np
import tensorflow as tf
from object_detection.utils import ops as utils_ops
from object_detection.utils import label_map_util
from object_detection.utils import visualization_utils as vis_util

utils_ops.tf = tf.compat.v1
tf.gfile = tf.io.gfile

category_index = label_map_util.create_category_index_from_labelmap(
    "labelmap/label_map.pbtxt", use_display_name=True)


def run_inference_for_single_image(model, image):
    image = np.asarray(image)

    # The input needs to be a tensor, convert it using `tf.convert_to_tensor`.
    input_tensor = tf.convert_to_tensor(image)
    # The model expects a batch of images, so add an axis with `tf.newaxis`.
    input_tensor = input_tensor[tf.newaxis, ...]

    # Run inference
    model_fn = model.signatures['serving_default']
    output_dict = model_fn(input_tensor)

    # All outputs are batches tensors.
    # Convert to numpy arrays, and take index [0] to remove the batch dimension.
    # We're only interested in the first num_detections.
    num_detections = int(output_dict.pop('num_detections'))
    output_dict = {key: value[0, :num_detections].numpy()
                   for key, value in output_dict.items()}
    output_dict['num_detections'] = num_detections

    # print(output_dict)

    # detection_classes should be ints.
    output_dict['detection_classes'] = output_dict['detection_classes'].astype(
        np.int64)

    return output_dict


def show_inference(model, image):
    image_np = np.array(image)

    # actual detection.
    output_dict = run_inference_for_single_image(model, image_np)
    # print('RESULT:', output_dict)

    # visualize detection results
    img_pred = vis_util.visualize_boxes_and_labels_on_image_array(
        image_np,
        output_dict['detection_boxes'],
        output_dict['detection_classes'],
        output_dict['detection_scores'],
        category_index,
        use_normalized_coordinates=True,
        min_score_thresh=0.5,
        line_thickness=4)

    # return list of diagnosis image + model inference scores
    return [img_pred, output_dict['detection_scores']]



def generate_model_report(diagnosis_scores):
    decision_threshold = 0.5
    significant_scores = diagnosis_scores[diagnosis_scores >
                                          decision_threshold]
    num_stones = len(significant_scores)
    
    report_msg = dict()
    report_msg['stones'] = num_stones
    report_msg['scores'] = diagnosis_scores.tolist()
    
    print(report_msg)
    return report_msg
