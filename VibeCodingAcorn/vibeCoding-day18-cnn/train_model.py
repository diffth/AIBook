import tensorflow as tf
from tensorflow.keras import datasets, layers, models
import os

def create_model():
    model = models.Sequential()
    model.add(layers.Conv2D(32, (3, 3), activation='relu', input_shape=(32, 32, 3)))
    model.add(layers.MaxPooling2D((2, 2)))
    model.add(layers.Conv2D(64, (3, 3), activation='relu'))
    model.add(layers.MaxPooling2D((2, 2)))
    model.add(layers.Conv2D(64, (3, 3), activation='relu'))
    model.add(layers.Flatten())
    model.add(layers.Dense(64, activation='relu'))
    model.add(layers.Dense(10, activation='softmax')) # 10 classes
    
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

def main():
    print("Loading CIFAR-10 dataset...")
    (train_images, train_labels), (test_images, test_labels) = datasets.cifar10.load_data()
    
    # Normalize pixel values to be between 0 and 1
    train_images, test_images = train_images / 255.0, test_images / 255.0

    model = create_model()
    
    print("Training model... (This will take a few minutes)")
    # Train for 5 epochs for a balance of speed and simple demo performance
    history = model.fit(train_images, train_labels, epochs=5, 
                        validation_data=(test_images, test_labels))
    
    # Save the model
    model_path = 'cifar10_cnn_model.h5'
    model.save(model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    main()
