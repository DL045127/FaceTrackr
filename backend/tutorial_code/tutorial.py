import cv2

img = cv2.imread("assets/elevator.png", 0)
cv2.imshow("Elevator", img)
cv2.waitKey(0)
cv2.destroyAllWindows()